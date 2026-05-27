import { useCallback, useEffect, useRef, useState } from 'react'
import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'

/**
 * NodeView render ảnh với 4 resize handles ở 4 góc.
 * Kéo handle thay đổi width, giữ nguyên tỉ lệ (aspect ratio).
 */
export function ResizableImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, alt, title, width } = node.attrs
  const imgRef = useRef<HTMLImageElement>(null)
  const [resizing, setResizing] = useState(false)
  const [currentWidth, setCurrentWidth] = useState<number | null>(width ? Number(width) : null)

  const isEditable = editor.isEditable

  // Sync width from attribute changes (e.g. collab updates)
  useEffect(() => {
    setCurrentWidth(width ? Number(width) : null)
  }, [width])

  const onMouseDown = useCallback(
    (corner: string, e: React.MouseEvent) => {
      if (!isEditable) return
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const img = imgRef.current
      if (!img) return
      const startWidth = img.offsetWidth

      setResizing(true)

      const onMouseMove = (ev: MouseEvent) => {
        // Tùy góc kéo: phải thì dx dương = phóng to, trái thì dx âm = phóng to
        const isLeft = corner === 'tl' || corner === 'bl'
        const dx = ev.clientX - startX
        const newWidth = Math.max(50, startWidth + (isLeft ? -dx : dx))
        setCurrentWidth(newWidth)
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        setResizing(false)

        // Lưu width vào node attribute → đồng bộ qua Yjs
        const img = imgRef.current
        if (img) {
          updateAttributes({ width: img.offsetWidth })
        }
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [isEditable, updateAttributes],
  )

  return (
    <NodeViewWrapper as="span" className="resizable-image-wrapper" style={{ display: 'inline-block' }}>
      <span
        className={`resizable-image-container${selected ? ' selected' : ''}${resizing ? ' resizing' : ''}`}
        style={{
          display: 'inline-block',
          position: 'relative',
          maxWidth: '100%',
          lineHeight: 0,
        }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          title={title || ''}
          style={{
            width: currentWidth ? `${currentWidth}px` : undefined,
            maxWidth: '100%',
            height: 'auto',
            borderRadius: 4,
            display: 'block',
          }}
          draggable={false}
        />

        {/* Resize handles — chỉ hiện khi selected và editor có thể chỉnh sửa */}
        {isEditable && selected && (
          <>
            <span className="resize-handle resize-handle-tl" onMouseDown={(e) => onMouseDown('tl', e)} />
            <span className="resize-handle resize-handle-tr" onMouseDown={(e) => onMouseDown('tr', e)} />
            <span className="resize-handle resize-handle-bl" onMouseDown={(e) => onMouseDown('bl', e)} />
            <span className="resize-handle resize-handle-br" onMouseDown={(e) => onMouseDown('br', e)} />
          </>
        )}
      </span>
    </NodeViewWrapper>
  )
}
