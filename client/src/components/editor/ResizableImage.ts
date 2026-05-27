import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ResizableImageView } from './ResizableImageView'

/**
 * Extension mở rộng từ @tiptap/extension-image, thêm:
 * - Thuộc tính width để lưu kích thước ảnh
 * - Custom NodeView với resize handles
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('width') || el.style.width?.replace('px', '') || null,
        renderHTML: (attrs) => {
          if (!attrs.width) return {}
          return { width: attrs.width, style: `width: ${attrs.width}px` }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
