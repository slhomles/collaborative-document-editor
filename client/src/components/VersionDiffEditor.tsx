import { useEffect, useMemo, useRef } from 'react'
import { Extension, useEditor, EditorContent } from '@tiptap/react'
import type { JSONContent } from '@tiptap/react'
import { getBaseExtensions } from '../lib/editorExtensions'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'
import { diffWords } from 'diff'

interface Props {
  content: JSONContent | null
  prevContent: JSONContent | null
  highlight: boolean
  activeAnchor: number
  onAnchors: (count: number) => void
}

const diffKey = new PluginKey('versionDiffDeco')

type Block = { node: PMNode; pos: number; size: number }
type Op = { t: 'same'; ci: number } | { t: 'add'; ci: number } | { t: 'del'; pi: number }

function topBlocks(doc: PMNode): Block[] {
  const blocks: Block[] = []
  doc.forEach((node, offset) => blocks.push({ node, pos: offset, size: node.nodeSize }))
  return blocks
}

function sig(node: PMNode): string {
  return `${node.type.name}|${JSON.stringify(node.attrs)}|${node.textContent}`
}

// LCS giữa 2 mảng chữ ký block → danh sách thao tác (giữ nguyên / thêm / xóa).
function lcsOps(prev: string[], curr: string[]): Op[] {
  const m = prev.length
  const n = curr.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = prev[i] === curr[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const ops: Op[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (prev[i] === curr[j]) {
      ops.push({ t: 'same', ci: j })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ t: 'del', pi: i })
      i++
    } else {
      ops.push({ t: 'add', ci: j })
      j++
    }
  }
  while (i < m) ops.push({ t: 'del', pi: i++ })
  while (j < n) ops.push({ t: 'add', ci: j++ })
  return ops
}

function renderRemovedBlock(node: PMNode): HTMLElement {
  const el = document.createElement('div')
  el.className = 'diff-deleted-block'
  el.textContent = node.textContent || ' '
  return el
}

function renderRemovedInline(text: string): HTMLElement {
  const el = document.createElement('span')
  el.className = 'diff-deleted'
  el.textContent = text
  return el
}

// Tách phần thực sự khác giữa 2 chuỗi: bỏ tiền tố + hậu tố chung (mức ký tự).
// "34" vs "3445" → prefix "34", removed "", added "45" (thay vì coi cả token bị thay).
function trimCommon(rem: string, add: string) {
  const max = Math.min(rem.length, add.length)
  let pre = 0
  while (pre < max && rem[pre] === add[pre]) pre++
  let suf = 0
  while (suf < max - pre && rem[rem.length - 1 - suf] === add[add.length - 1 - suf]) suf++
  return {
    pre,
    suf,
    remMid: rem.slice(pre, rem.length - suf),
    addMid: add.slice(pre, add.length - suf),
  }
}

// Diff theo TỪ giữa 2 đoạn cùng loại (block bị sửa): chỉ tô phần thêm/xóa, giữ nguyên phần chung.
// Map offset ký tự trong textContent → vị trí ProseMirror (đoạn văn: content bắt đầu tại pos+1).
function inlineWordDecos(prevNode: PMNode, curr: Block, decos: Decoration[]) {
  const contentStart = curr.pos + 1
  let offset = 0

  const pushRemoved = (text: string, key: string) => {
    decos.push(
      Decoration.widget(contentStart + offset, () => renderRemovedInline(text), { side: -1, key }),
    )
  }
  const pushAdded = (len: number) => {
    decos.push(Decoration.inline(contentStart + offset, contentStart + offset + len, { class: 'diff-added' }))
    offset += len
  }

  const parts = diffWords(prevNode.textContent, curr.node.textContent)
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const next = parts[i + 1]

    // Cặp "xóa + thêm" liền nhau = từ bị SỬA → tinh chỉnh theo ký tự để giữ phần chung.
    if (part.removed && next?.added) {
      const { pre, suf, remMid, addMid } = trimCommon(part.value, next.value)
      offset += pre // tiền tố chung đã có trong bản mới → không tô
      if (remMid) pushRemoved(remMid, `delw-${curr.pos}-${i}`)
      if (addMid) pushAdded(addMid.length)
      offset += suf // hậu tố chung
      i++ // đã xử lý luôn part 'added' ghép cặp
      continue
    }

    if (part.added) {
      pushAdded(part.value.length)
    } else if (part.removed) {
      pushRemoved(part.value, `delw-${curr.pos}-${i}`)
    } else {
      offset += part.value.length
    }
  }
}

// So sánh nội dung version hiện tại với version trước theo khối → decorations + danh sách mốc (anchors).
function computeBlockDiff(
  currDoc: PMNode,
  prevDoc: PMNode | null,
  highlight: boolean,
): { decorations: DecorationSet; anchors: number[] } {
  const currBlocks = topBlocks(currDoc)
  const anchors: number[] = []
  const decos: Decoration[] = []

  // Không có version trước (bản gốc) → coi toàn bộ là nội dung mới thêm.
  if (!prevDoc) {
    if (highlight) {
      for (const b of currBlocks) {
        decos.push(Decoration.node(b.pos, b.pos + b.size, { class: 'diff-added-block' }))
      }
    }
    if (currBlocks.length) anchors.push(currBlocks[0].pos)
    return { decorations: DecorationSet.create(currDoc, decos), anchors }
  }

  const prevBlocks = topBlocks(prevDoc)
  const ops = lcsOps(prevBlocks.map((b) => sig(b.node)), currBlocks.map((b) => sig(b.node)))

  let currCursor = 0
  let prevWasChange = false
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]
    if (op.t === 'same') {
      currCursor += currBlocks[op.ci].size
      prevWasChange = false
      continue
    }
    if (op.t === 'add') {
      const b = currBlocks[op.ci]
      if (highlight) decos.push(Decoration.node(b.pos, b.pos + b.size, { class: 'diff-added-block' }))
      if (!prevWasChange) anchors.push(b.pos)
      currCursor += b.size
      prevWasChange = true
      continue
    }
    // op.t === 'del'
    const pb = prevBlocks[op.pi]
    const next = ops[k + 1]
    // del + add liền nhau, cùng loại textblock → block bị SỬA → diff theo từ trong đoạn.
    if (next && next.t === 'add') {
      const cb = currBlocks[next.ci]
      if (pb.node.isTextblock && cb.node.isTextblock && pb.node.type.name === cb.node.type.name) {
        if (highlight) inlineWordDecos(pb.node, cb, decos)
        if (!prevWasChange) anchors.push(cb.pos)
        currCursor += cb.size
        prevWasChange = true
        k++ // đã xử lý luôn op 'add' ghép cặp
        continue
      }
    }
    // Xóa nguyên block.
    const pos = Math.min(currCursor, currDoc.content.size)
    if (highlight) {
      decos.push(
        Decoration.widget(pos, () => renderRemovedBlock(pb.node), { side: -1, key: `del-${op.pi}` }),
      )
    }
    if (!prevWasChange) anchors.push(pos)
    prevWasChange = true
  }

  return { decorations: DecorationSet.create(currDoc, decos), anchors }
}

export function VersionDiffEditor({ content, prevContent, highlight, activeAnchor, onAnchors }: Props) {
  const decoRef = useRef<DecorationSet>(DecorationSet.empty)
  const anchorsRef = useRef<number[]>([])
  const onAnchorsRef = useRef(onAnchors)
  onAnchorsRef.current = onAnchors

  // Extension cấp decoration — đọc DecorationSet mới nhất từ ref, refresh qua meta transaction.
  const diffExtension = useMemo(
    () =>
      Extension.create({
        name: 'versionDiff',
        addProseMirrorPlugins() {
          return [
            new Plugin({
              key: diffKey,
              props: { decorations: () => decoRef.current },
            }),
          ]
        },
      }),
    [],
  )

  const editor = useEditor({
    editable: false,
    extensions: [...getBaseExtensions(), diffExtension],
    content: content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
  })

  // Nạp nội dung version + tính diff mỗi khi đổi version hoặc bật/tắt highlight.
  useEffect(() => {
    if (!editor) return
    decoRef.current = DecorationSet.empty
    editor.commands.setContent(content ?? { type: 'doc', content: [{ type: 'paragraph' }] }, false)

    const currDoc = editor.state.doc
    const prevDoc = prevContent ? editor.schema.nodeFromJSON(prevContent) : null
    const { decorations, anchors } = computeBlockDiff(currDoc, prevDoc, highlight)
    decoRef.current = decorations
    anchorsRef.current = anchors
    editor.view.dispatch(editor.state.tr.setMeta(diffKey, true))
    onAnchorsRef.current(anchors.length)
  }, [editor, content, prevContent, highlight])

  // Điều hướng tới mốc thay đổi đang chọn.
  useEffect(() => {
    if (!editor) return
    const anchors = anchorsRef.current
    if (activeAnchor < 0 || activeAnchor >= anchors.length) return
    const pos = anchors[activeAnchor]
    let dom = editor.view.nodeDOM(pos) as HTMLElement | null
    if (!dom) dom = editor.view.domAtPos(Math.min(pos + 1, editor.state.doc.content.size)).node as HTMLElement | null
    const el = dom?.nodeType === 3 ? dom.parentElement : dom
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('diff-anchor-flash')
      setTimeout(() => el.classList.remove('diff-anchor-flash'), 1200)
    }
  }, [editor, activeAnchor])

  return (
    <div className="editor-wrapper version-diff">
      <EditorContent editor={editor} />
    </div>
  )
}
