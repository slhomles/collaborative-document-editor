// Danh sách extensions dùng chung cho editor chính, snapshot parser, và version diff viewer.
// Đảm bảo mọi nơi render/parse nội dung đều nhận diện đầy đủ các node/mark.

import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import { ResizableImage } from '../components/editor/ResizableImage'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { FontSize } from '../components/editor/FontSize'

/**
 * Extensions cơ bản dùng cho mọi editor context (chính, snapshot, diff).
 * KHÔNG bao gồm Collaboration, CollaborationCursor (chỉ cần cho editor chính).
 */
export function getBaseExtensions() {
  return [
    StarterKit.configure({ history: false }),
    Underline,
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    Highlight.configure({ multicolor: true }),
    Link.configure({ openOnClick: false, autolink: true }),
    ResizableImage,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
  ]
}
