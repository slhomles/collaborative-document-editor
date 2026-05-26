// Build the technical report .docx for collab-editor.
// Format: Times New Roman 13pt; Headings H1-H3 black 13pt bold; body black 13pt regular.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType,
  TableOfContents, PageNumber, PageBreak, Footer, Header,
} = require("docx");

const FONT = "Times New Roman";
const SIZE = 26;          // 13pt (half-points)
const CODE_FONT = "Courier New";
const CODE_SIZE = 20;     // 10pt for code readability
const BLACK = "000000";
const CW = 9360;          // content width (US Letter, 1" margins)

// ---------- helpers ----------
function p(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, font: FONT, size: SIZE, color: BLACK })];
  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 120, line: 276, ...(opts.before ? { before: opts.before } : {}) },
    indent: opts.indent,
    children: runs,
  });
}
function run(text, o = {}) {
  return new TextRun({ text, font: FONT, size: SIZE, color: BLACK, bold: !!o.bold, italics: !!o.italics });
}
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: FONT, size: SIZE, bold: true, color: BLACK })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT, size: SIZE, bold: true, color: BLACK })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: FONT, size: SIZE, bold: true, color: BLACK })] });
}
function bullet(text, level = 0) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, font: FONT, size: SIZE, color: BLACK })];
  return new Paragraph({ numbering: { reference: "bullets", level }, spacing: { after: 80, line: 276 }, alignment: AlignmentType.JUSTIFIED, children: runs });
}
function numbered(text, ref = "nums") {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, font: FONT, size: SIZE, color: BLACK })];
  return new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80, line: 276 }, alignment: AlignmentType.JUSTIFIED, children: runs });
}
// code block: one shaded paragraph, lines joined by breaks
function code(lines) {
  const children = [];
  lines.forEach((ln, i) => {
    children.push(new TextRun({ text: ln === "" ? " " : ln, font: CODE_FONT, size: CODE_SIZE, color: "1A1A1A", break: i === 0 ? 0 : 1 }));
  });
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: "F3F3F3", color: "auto" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: "9E9E9E", space: 6 } },
    spacing: { before: 80, after: 140, line: 240 },
    indent: { left: 120 },
    children,
  });
}
function figure(file, caption, w, h) {
  const dims = { 1745: [1745, 1272], 0: 0 };
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: "png", data: fs.readFileSync(file), transformation: { width: w, height: h }, altText: { title: caption, description: caption, name: caption } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: caption, font: FONT, size: 24, italics: true, color: "333333", bold: true })],
    }),
  ];
}
function tcell(text, { w, head = false, fill } = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 24, bold: head, color: BLACK })] })],
  });
}
const A = "report_assets"; // relative path used at runtime (cwd = report_assets) -> set below

// ============================ CONTENT ============================
const ASSET = "."; // run from report_assets dir

const children = [];

// ---- Title page ----
children.push(
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 80 }, children: [new TextRun({ text: "BÁO CÁO ĐỒ ÁN MÔN HỌC", font: FONT, size: 28, bold: true, color: BLACK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: "HỆ THỐNG PHÂN TÁN", font: FONT, size: 26, color: BLACK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Trình soạn thảo tài liệu cộng tác thời gian thực (collab-editor)", font: FONT, size: 30, bold: true, color: BLACK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: "Kiến trúc hệ thống & Mô hình đồng bộ dữ liệu", font: FONT, size: 28, italics: true, color: BLACK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Công nghệ: React · Tiptap · Yjs (CRDT) · Hocuspocus · Redis · PostgreSQL", font: FONT, size: 24, color: "444444" })] }),
);
children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- TOC ----
children.push(
  new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "MỤC LỤC", font: FONT, size: SIZE, bold: true, color: BLACK })] }),
  new TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-3" }),
);
children.push(new Paragraph({ children: [new PageBreak()] }));

// =========================================================
// PHẦN I — KIẾN TRÚC HỆ THỐNG
// =========================================================
children.push(h1("I. KIẾN TRÚC HỆ THỐNG"));

children.push(h2("1.1. Tổng quan và mục tiêu thiết kế"));
children.push(p("collab-editor là một trình soạn thảo tài liệu cho phép nhiều người dùng cùng chỉnh sửa một văn bản trong thời gian thực, tương tự Google Docs. Vì nhiều người có thể thao tác đồng thời trên cùng một tài liệu từ nhiều máy khác nhau, hệ thống mang đầy đủ đặc trưng của một hệ phân tán: nhiều bản sao dữ liệu (replica) cùng tồn tại, độ trễ mạng giữa các nút là không thể tránh khỏi, và kết nối có thể gián đoạn bất cứ lúc nào."));
children.push(p("Để giải quyết các thách thức đó, kiến trúc được thiết kế hướng tới bốn mục tiêu cốt lõi:"));
children.push(bullet([run("Thời gian thực (real-time): ", { bold: true }), run("thay đổi của một người dùng phải hiển thị trên màn hình của những người còn lại gần như tức thì.")]));
children.push(bullet([run("Không xung đột (conflict-free): ", { bold: true }), run("các chỉnh sửa đồng thời phải tự động hòa giải mà không mất dữ liệu và không cần khóa (lock).")]));
children.push(bullet([run("Bền vững (durable): ", { bold: true }), run("nội dung tài liệu không được mất khi server khởi động lại hay khi mọi người dùng thoát ra.")]));
children.push(bullet([run("Hoạt động ngoại tuyến (offline-capable): ", { bold: true }), run("người dùng vẫn soạn thảo được khi mất mạng và dữ liệu sẽ tự đồng bộ lại khi kết nối phục hồi.")]));
children.push(p("Hệ thống được tổ chức thành ba tầng rõ rệt — tầng Client (trình duyệt), tầng Server (Node.js) và tầng Lưu trữ (Redis + PostgreSQL) — như minh họa ở Hình 1."));

children.push(h2("1.2. Sơ đồ kiến trúc tổng thể"));
children.push(...figure(`${ASSET}/fig1_architecture.png`, "Hình 1. Kiến trúc ba tầng của hệ thống collab-editor", 600, 437));
children.push(p("Điểm đặc biệt của kiến trúc là client kết nối song song tới hai server khác nhau: một kết nối HTTP/REST tới Express dùng cho thao tác lấy dữ liệu và biến đổi (mutation) không thường xuyên (đăng nhập, tạo/xóa tài liệu, chia sẻ), và một kết nối WebSocket tới Hocuspocus dùng riêng cho luồng đồng bộ CRDT liên tục. Cách tách này được phân tích chi tiết ở mục 1.4."));

children.push(h2("1.3. Tầng Client (Frontend)"));
children.push(p("Client là một ứng dụng single-page (SPA) viết bằng React, đóng gói bằng Vite. Toàn bộ logic cộng tác được gói trong hook tùy biến useCollabEditor (client/src/hooks/useCollabEditor.ts). Hook này khởi tạo và liên kết các thành phần sau:"));
children.push(bullet([run("Tiptap Editor: ", { bold: true }), run("lớp giao diện soạn thảo (dựa trên ProseMirror), cung cấp các tính năng định dạng văn bản (đậm, nghiêng, heading, danh sách, hình ảnh, liên kết…). Đáng chú ý, StarterKit được cấu hình tắt history vì lịch sử undo/redo do Yjs đảm nhiệm.")]));
children.push(bullet([run("Yjs Document (Y.Doc): ", { bold: true }), run("cấu trúc dữ liệu CRDT trong bộ nhớ, là 'nguồn sự thật' của nội dung tài liệu ở phía client. Mọi thao tác gõ phím được Tiptap chuyển thành thao tác CRDT trên Y.Doc.")]));
children.push(bullet([run("HocuspocusProvider: ", { bold: true }), run("cầu nối WebSocket giữa Y.Doc và Hocuspocus server. Lưu ý quan trọng: dự án dùng HocuspocusProvider chứ không dùng y-websocket, vì Hocuspocus 2.x đa hợp nhiều tài liệu trên một kết nối và mỗi message được gắn tiền tố tên tài liệu — phải dùng đúng provider để khớp giao thức.")]));
children.push(bullet([run("IndexeddbPersistence: ", { bold: true }), run("lưu bản sao Y.Doc xuống IndexedDB của trình duyệt, giúp ứng dụng hoạt động ngoại tuyến và tự đồng bộ khi online trở lại.")]));
children.push(bullet([run("CollaborationCursor (Awareness): ", { bold: true }), run("hiển thị con trỏ và vùng chọn của những người dùng khác theo thời gian thực, mỗi người một màu.")]));
children.push(p("Đoạn mã sau (rút gọn từ useCollabEditor.ts) cho thấy cách ba thành phần Y.Doc, provider và IndexedDB được kết nối với nhau:"));
children.push(code([
  "const ydoc = useMemo(() => new Y.Doc(), [documentId])",
  "",
  "const provider = useMemo(() => new HocuspocusProvider({",
  "  url: WS_URL, name: documentId, document: ydoc,",
  "  token: token || '', broadcast: false,",
  "}), [documentId, ydoc, token])",
  "",
  "// Lưu offline; tự đồng bộ lại khi reconnect",
  "const indexeddbProvider = useMemo(",
  "  () => new IndexeddbPersistence(`collab-${documentId}`, ydoc),",
  "  [documentId, ydoc])",
]));

children.push(h2("1.4. Tầng Server — thiết kế hai server song song"));
children.push(p("Backend (server/src/index.ts) khởi chạy đồng thời hai server độc lập trong cùng một tiến trình Node.js:"));
children.push(numbered([run("Express HTTP server (cổng 3000) — ", { bold: true }), run("cung cấp REST API cho xác thực (/api/auth) và quản lý tài liệu (/api/documents): liệt kê, tạo, sửa metadata, xóa, tìm kiếm, đánh dấu sao, lịch sử xem, quản lý thành viên và quản lý phiên bản (versions).")]));
children.push(numbered([run("Hocuspocus WebSocket server (cổng 1234) — ", { bold: true }), run("chuyên trách đồng bộ trạng thái CRDT thời gian thực giữa các client.")]));
children.push(p([run("Lý do tách hai server: ", { bold: true }), run("hai loại lưu lượng có đặc tính hoàn toàn khác nhau. REST là các yêu cầu rời rạc, request–response ngắn, hợp với mô hình HTTP không trạng thái. Ngược lại, đồng bộ cộng tác là luồng message hai chiều, tần suất cao, đòi hỏi kết nối duy trì lâu dài — đặc trưng của WebSocket. Tách biệt giúp mỗi server tối ưu cho mô hình giao tiếp của mình, đồng thời cô lập tải: việc một tài liệu có nhiều người cùng gõ liên tục không làm nghẽn các API quản lý.")]));
children.push(code([
  "// server/src/index.ts",
  "app.use('/api/auth', authRouter)",
  "app.use('/api/documents', documentRouter)",
  "app.listen(PORT, () => ...)            // HTTP 3000",
  "",
  "hocuspocusServer.listen(WS_PORT, ...)  // WebSocket 1234",
]));

children.push(h2("1.5. Tầng lưu trữ — chiến lược dual-layer"));
children.push(p("Tầng lưu trữ kết hợp hai hệ quản trị dữ liệu với vai trò bổ trợ nhau (chi tiết cơ chế ở mục 2.6):"));
children.push(bullet([run("Redis (cache nhanh, TTL 24 giờ): ", { bold: true }), run("lưu trạng thái Yjs nhị phân dưới khóa yjs:<documentId>, phục vụ đọc/ghi tốc độ cao trong lúc tài liệu đang được mở.")]));
children.push(bullet([run("PostgreSQL (lưu trữ bền vững): ", { bold: true }), run("lưu trạng thái Yjs trong cột nhị phân Document.yjsState, cùng toàn bộ metadata quan hệ (người dùng, tài liệu, thành viên, phiên bản).")]));
children.push(p("Lược đồ dữ liệu được mô tả bằng Prisma (prisma/schema.prisma) gồm các thực thể chính:"));
const dbTable = new Table({
  width: { size: CW, type: WidthType.DXA },
  columnWidths: [2400, 6960],
  rows: [
    new TableRow({ tableHeader: true, children: [tcell("Bảng", { w: 2400, head: true, fill: "D9E2F3" }), tcell("Vai trò", { w: 6960, head: true, fill: "D9E2F3" })] }),
    new TableRow({ children: [tcell("User", { w: 2400 }), tcell("Tài khoản người dùng (email, mật khẩu băm, tên).", { w: 6960 })] }),
    new TableRow({ children: [tcell("Document", { w: 2400 }), tcell("Tài liệu: tiêu đề, ownerId, yjsState (nhị phân), contentPreview (text để tìm kiếm), publicRole (quyền qua link công khai).", { w: 6960 })] }),
    new TableRow({ children: [tcell("DocumentMember", { w: 2400 }), tcell("Bảng nối tài liệu–người dùng kèm vai trò (OWNER/EDITOR/VIEWER); ràng buộc duy nhất (documentId, userId).", { w: 6960 })] }),
    new TableRow({ children: [tcell("DocumentVersion", { w: 2400 }), tcell("Các bản snapshot Yjs theo thời điểm; isAuto phân biệt bản tự động và bản lưu thủ công.", { w: 6960 })] }),
    new TableRow({ children: [tcell("StarredDocument / DocumentViewed", { w: 2400 }), tcell("Đánh dấu sao và lịch sử xem của từng người dùng.", { w: 6960 })] }),
  ],
});
children.push(dbTable);
children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: " ", font: FONT, size: SIZE })] }));

children.push(h2("1.6. Mô hình phân quyền và bảo mật"));
children.push(p("Hệ thống áp dụng kiểm soát truy cập dựa trên vai trò (RBAC) với ba vai trò: OWNER (chủ sở hữu), EDITOR (chỉnh sửa) và VIEWER (chỉ xem). Hàm getDocumentRole (server/src/utils/documentAccess.ts) xác định vai trò của một người dùng đối với một tài liệu theo thứ tự ưu tiên:"));
children.push(numbered("Nếu là chủ sở hữu (ownerId trùng) → OWNER.", "nums2"));
children.push(numbered("Nếu là thành viên trong DocumentMember → vai trò tương ứng.", "nums2"));
children.push(numbered("Nếu tài liệu được chia sẻ công khai (publicRole là VIEWER/EDITOR) → vai trò công khai đó.", "nums2"));
children.push(numbered("Ngược lại → null (không có quyền, bị từ chối).", "nums2"));
children.push(p([run("Xác thực dùng JWT. ", { bold: true }), run("Token được ký bằng JWT_SECRET; client gửi kèm khi gọi REST (HTTP Authorization) và khi mở kết nối WebSocket. Hàm canEditDocument(role) trả về true với OWNER và EDITOR, dùng để quyết định một kết nối WebSocket là đọc–ghi hay chỉ-đọc (readOnly).")]));

children.push(h2("1.7. Luồng xác thực và thiết lập kết nối WebSocket"));
children.push(p("Trước khi cho phép một client tham gia chỉnh sửa, Hocuspocus thực hiện xác thực qua hook onAuthenticate (server/src/collab/hocuspocus.ts). Trình tự được mô tả ở Hình 2."));
children.push(...figure(`${ASSET}/fig2_ws_auth_sequence.png`, "Hình 2. Trình tự xác thực và phân quyền khi mở kết nối WebSocket", 600, 411));
children.push(code([
  "async onAuthenticate({ token, documentName, connection }) {",
  "  if (!token) throw new Error('Missing token')",
  "  const payload = jwt.verify(token, JWT_SECRET)  // -> userId",
  "  const role = await getDocumentRole(documentName, payload.userId)",
  "  if (!role) throw new Error('Forbidden')",
  "  // VIEWER -> readOnly; Hocuspocus tự từ chối message sync",
  "  connection.readOnly = !canEditDocument(role)",
  "  return { userId: payload.userId, documentId: documentName, role }",
  "}",
]));
children.push(p("Điểm tinh tế: ngoài việc kiểm tra một lần khi kết nối, hook beforeHandleMessage còn tái kiểm tra quyền trên TỪNG message. Nhờ vậy, nếu chủ sở hữu thu hồi quyền chỉnh sửa của một người trong khi họ đang mở tài liệu, thay đổi có hiệu lực gần như ngay lập tức mà không cần người đó tải lại trang."));

children.push(new Paragraph({ children: [new PageBreak()] }));

// =========================================================
// PHẦN II — MÔ HÌNH ĐỒNG BỘ DỮ LIỆU
// =========================================================
children.push(h1("II. MÔ HÌNH ĐỒNG BỘ DỮ LIỆU"));

children.push(h2("2.1. Bài toán đồng bộ trong hệ phân tán"));
children.push(p("Khi nhiều người cùng chỉnh sửa một tài liệu, mỗi client giữ một bản sao cục bộ và thao tác trên đó để giao diện phản hồi tức thì (không chờ server). Hệ quả là tại một thời điểm, các bản sao có thể khác nhau. Bài toán đặt ra: làm sao để sau khi trao đổi các thay đổi, tất cả bản sao hội tụ về cùng một trạng thái, bất kể thứ tự đến của message và bất kể độ trễ mạng?"));
children.push(p("Xét một ví dụ kinh điển. Tài liệu ban đầu là chuỗi \"AC\". Người dùng A chèn ký tự 'B' vào giữa, gần như đồng thời người dùng B chèn 'D' vào cuối. Nếu chỉ dùng vị trí số (index) để mô tả thao tác, khi áp dụng chéo các thao tác này lên nhau, chỉ số có thể bị lệch và hai bên cho ra kết quả khác nhau (ví dụ \"ABCD\" so với \"ABDC\"). Đây chính là bài toán cần một mô hình đồng bộ đủ mạnh để giải quyết."));

children.push(h2("2.2. CRDT và lý do chọn Yjs"));
children.push(p("Có hai họ giải pháp phổ biến cho soạn thảo cộng tác: Operational Transformation (OT) và Conflict-free Replicated Data Types (CRDT)."));
children.push(bullet([run("OT ", { bold: true }), run("biến đổi các thao tác theo nhau để bù trừ độ lệch chỉ số. OT mạnh nhưng phức tạp và thường cần một server trung tâm đóng vai trò 'trọng tài' sắp thứ tự thao tác — khó kiểm thử và dễ sinh lỗi biên.")]));
children.push(bullet([run("CRDT ", { bold: true }), run("thiết kế cấu trúc dữ liệu sao cho phép hợp nhất (merge) có tính giao hoán, kết hợp và lũy đẳng. Nhờ đó, áp dụng các thao tác theo bất kỳ thứ tự nào cũng cho cùng kết quả, không cần trọng tài trung tâm.")]));
children.push(p([run("Dự án chọn Yjs", { bold: true }), run(" — một thư viện CRDT hiệu năng cao. Yjs gán cho mỗi ký tự một định danh duy nhất gồm (clientID, đồng hồ logic) và lưu vị trí theo quan hệ tương đối giữa các ký tự thay vì chỉ số tuyệt đối. Chính nhờ định danh duy nhất và vị trí tương đối mà các thao tác chèn/xóa đồng thời luôn hợp nhất về một trật tự xác định, giải quyết triệt để bài toán ở mục 2.1. Yjs cũng tích hợp sẵn với Tiptap và Hocuspocus, đồng thời mã hóa cập nhật ở dạng nhị phân nhỏ gọn.")]));

children.push(h2("2.3. Nguyên lý CRDT qua ví dụ"));
children.push(p("Quay lại ví dụ \"AC\". Với Yjs, khi A chèn 'B' giữa A và C, thao tác không nói 'chèn vào vị trí số 1' mà nói 'chèn một ký tự mới có ID (clientA, 1) nằm SAU ký tự A'. Tương tự, B chèn 'D' có ID (clientB, 1) nằm SAU ký tự C. Vì mỗi ký tự neo vào một ký tự láng giềng cụ thể (chứ không vào một chỉ số có thể dịch chuyển), việc áp dụng hai thao tác này theo thứ tự nào cũng cho cùng kết quả \"ABCD\". Hình 3 minh họa quá trình hội tụ."));
children.push(...figure(`${ASSET}/fig3_crdt_convergence.png`, "Hình 3. Hai thao tác chèn đồng thời hội tụ về cùng kết quả nhờ CRDT", 600, 384));
children.push(p("Trường hợp hai người chèn ký tự vào CÙNG một vị trí (cùng neo sau một ký tự), Yjs dùng so sánh clientID để quyết định trật tự một cách tất định. Quy tắc này giống nhau trên mọi bản sao, nên kết quả vẫn nhất quán tuyệt đối. Đây là điểm mấu chốt giúp loại bỏ hoàn toàn xung đột mà không cần khóa."));

children.push(h2("2.4. Giao thức đồng bộ"));
children.push(p("Việc trao đổi trạng thái giữa client và server tuân theo giao thức của Yjs (y-protocols) mà Hocuspocus hiện thực, gồm các loại message chính:"));
children.push(bullet([run("Sync Step 1: ", { bold: true }), run("khi mở tài liệu, client gửi 'state vector' (tóm tắt những gì nó đã biết) để hai bên xác định phần còn thiếu của nhau.")]));
children.push(bullet([run("Sync Step 2 / Update: ", { bold: true }), run("mỗi bên gửi đúng phần thay đổi (delta nhị phân) mà bên kia chưa có. Sau đó, mọi chỉnh sửa tiếp theo được phát đi như các update tăng trưởng, rất nhỏ gọn.")]));
children.push(bullet([run("Awareness: ", { bold: true }), run("một kênh riêng truyền thông tin tạm thời (con trỏ, vùng chọn, danh tính người đang online), không lưu vào tài liệu.")]));
children.push(p("Ở phía client, toàn bộ phần phức tạp này được HocuspocusProvider lo liệu; lập trình viên chỉ cần truyền Y.Doc và token như đã thấy ở mục 1.3. Tham số broadcast: false tắt cơ chế đồng bộ giữa các tab cùng trình duyệt qua BroadcastChannel, để mọi đồng bộ đi qua server một cách nhất quán."));

children.push(h2("2.5. Trình tự đồng bộ thời gian thực đầu–cuối"));
children.push(p("Hình 4 mô tả đầy đủ một vòng đồng bộ: từ lúc người dùng A gõ phím cho tới khi thay đổi hiển thị trên màn hình người dùng B và được lưu trữ."));
children.push(...figure(`${ASSET}/fig4_realtime_sync_sequence.png`, "Hình 4. Trình tự đồng bộ thời gian thực và lưu trữ phía server", 600, 394));
children.push(p("Trái tim của luồng này là hook onChange phía server (server/src/collab/hocuspocus.ts). Mỗi khi tài liệu thay đổi, server vừa phát update cho các client khác (Hocuspocus tự động làm), vừa kích hoạt hai tác vụ lưu trữ bất đồng bộ:"));
children.push(code([
  "async onChange({ documentName, document, context }) {",
  "  const state = Buffer.from(Y.encodeStateAsUpdate(document))",
  "  // Gộp keystroke trong 300ms -> 1 lần ghi Redis",
  "  throttledCacheUpdate(documentName, state)",
  "  if (context.userId) {",
  "    scheduleAutoSnapshot(documentName, context.userId, state)",
  "    scheduleContentPreviewUpdate(documentName, extractPlainText(document))",
  "  }",
  "}",
]));
children.push(p("Như vậy đường đi 'nóng' (phát update cho người khác) được tách khỏi đường đi 'lưu trữ' (ghi cache, tạo phiên bản, cập nhật preview), giúp độ trễ cảm nhận của người dùng luôn thấp."));

children.push(h2("2.6. Lưu trữ và khôi phục trạng thái"));
children.push(p("Cơ chế lưu trữ hai tầng (Hình 5) được hiện thực trong server/src/collab/persistence.ts, gồm một luồng đọc và một luồng ghi."));
children.push(...figure(`${ASSET}/fig5_persistence.png`, "Hình 5. Luồng đọc và ghi của lưu trữ hai tầng Redis + PostgreSQL", 600, 384));
children.push(h3("a) Luồng đọc (khi mở tài liệu)"));
children.push(p("Hook onLoadDocument gọi loadDocument: ưu tiên đọc Redis (nhanh); nếu trúng cache thì làm mới TTL để tài liệu đang mở liên tục không bị xóa sau 24 giờ. Nếu Redis trượt (hoặc Redis sự cố), hệ thống fallback an toàn về PostgreSQL."));
children.push(code([
  "export async function loadDocument(documentId) {",
  "  try {                                   // 1) thử Redis",
  "    const cached = await redis.getBuffer(redisKey(documentId))",
  "    if (cached) { redis.expire(...)       // refresh TTL",
  "                  return cached }",
  "  } catch { /* Redis lỗi -> bỏ qua, fallback DB */ }",
  "  const doc = await prisma.document.findUnique(...)  // 2) PostgreSQL",
  "  return doc?.yjsState ? Buffer.from(doc.yjsState) : null",
  "}",
]));
children.push(h3("b) Luồng ghi (khi chỉnh sửa và khi đóng)"));
children.push(p("Trong lúc soạn thảo, throttledCacheUpdate gộp nhiều keystroke trong cửa sổ 300ms thành một lần ghi Redis duy nhất (chỉ ghi bản mới nhất), tránh việc nện Redis trên từng phím gõ nhưng vẫn đảm bảo cache luôn giữ trạng thái mới nhất."));
children.push(code([
  "export function throttledCacheUpdate(documentId, state) {",
  "  pendingCacheState.set(documentId, state)",
  "  if (cacheTimers.has(documentId)) return   // đã có timer -> chờ",
  "  const timer = setTimeout(async () => {",
  "    const latest = pendingCacheState.get(documentId)  // bản mới nhất",
  "    await redis.setex(redisKey(documentId), REDIS_TTL, latest)",
  "  }, CACHE_THROTTLE_MS)  // 300ms",
  "  cacheTimers.set(documentId, timer)",
  "}",
]));
children.push(p("Khi người dùng CUỐI CÙNG rời tài liệu, Hocuspocus gọi onStoreDocument để ghi trạng thái đầy đủ xuống cả Redis và PostgreSQL (đảm bảo bền vững), đồng thời cập nhật contentPreview (text thuần phục vụ tìm kiếm nội dung) và chốt một phiên bản cuối. Triết lý chung: Redis là tầng tăng tốc và có thể lỗi (lazyConnect, mọi lỗi đều non-fatal), còn PostgreSQL là nguồn dữ liệu bền vững cuối cùng."));

children.push(h2("2.7. Đồng bộ ngoại tuyến với IndexedDB"));
children.push(p("Mỗi tài liệu có một bản sao Y.Doc lưu trong IndexedDB của trình duyệt qua IndexeddbPersistence. Nhờ đó, khi mất mạng, người dùng vẫn tiếp tục soạn thảo bình thường — các thay đổi được ghi vào CRDT cục bộ và IndexedDB. Khi kết nối phục hồi, HocuspocusProvider tự thực hiện lại quy trình Sync Step 1/2: trao đổi state vector với server và hợp nhất hai phía. Vì Yjs là CRDT, việc hợp nhất các thay đổi ngoại tuyến với những thay đổi đã xảy ra trên server trong lúc đó luôn cho kết quả nhất quán, không mất dữ liệu và không cần người dùng can thiệp."));

children.push(h2("2.8. Tự động tạo phiên bản (auto-versioning)"));
children.push(p("Để người dùng có thể xem lại và khôi phục lịch sử (giống Google Docs), hệ thống tự động tạo các snapshot. scheduleAutoSnapshot áp dụng chiến lược kết hợp hai điều kiện:"));
children.push(bullet([run("Theo trạng thái nhàn rỗi (idle): ", { bold: true }), run("chốt một bản sau 2 phút kể từ khi người dùng ngừng gõ.")]));
children.push(bullet([run("Theo thời gian tối đa (maxWait): ", { bold: true }), run("nếu người dùng gõ liên tục không nghỉ, vẫn chốt một bản checkpoint sau tối đa 10 phút.")]));
children.push(bullet([run("Chốt khi đóng: ", { bold: true }), run("thêm một bản cuối khi người dùng cuối rời tài liệu (flushSnapshotOnStore).")]));
children.push(p("Để tránh tạo các bản trùng nhau, mỗi snapshot được so sánh bằng băm SHA-1 của trạng thái: nếu nội dung không đổi so với bản gần nhất thì bỏ qua. Ngoài ra, hàm pruneAutoVersions tỉa thưa dần các bản tự động để danh sách gọn gàng: giữ tất cả bản trong 1 giờ gần nhất, giữ một bản mỗi giờ với khoảng 1–24 giờ, và một bản mỗi ngày với phần cũ hơn. Các bản người dùng lưu thủ công (isAuto = false, có đặt tên) không bao giờ bị tỉa."));
children.push(code([
  "export function scheduleAutoSnapshot(documentId, userId, state) {",
  "  lastEditorByDoc.set(documentId, userId)",
  "  pendingSnapshotState.set(documentId, state)",
  "  if (!dirtySince.has(documentId)) dirtySince.set(documentId, Date.now())",
  "  const since = dirtySince.get(documentId)",
  "  if (Date.now() - since >= AUTO_MAX_WAIT_MS)   // gõ liên tục > 10'",
  "    return void maybeAutoSnapshot(documentId)",
  "  // ngược lại: chốt sau khi ngừng gõ 2 phút (idle)",
  "  clearTimeout(snapshotTimers.get(documentId))",
  "  snapshotTimers.set(documentId,",
  "    setTimeout(() => maybeAutoSnapshot(documentId), AUTO_IDLE_MS))",
  "}",
]));

children.push(h2("2.9. Tính nhất quán cuối và các đảm bảo của hệ thống"));
children.push(p("Mô hình đồng bộ của collab-editor mang lại tính nhất quán cuối (eventual consistency): tại một thời điểm các bản sao có thể tạm khác nhau do độ trễ, nhưng khi mọi update đã được trao đổi xong, tất cả chắc chắn hội tụ về cùng một trạng thái. Tổng hợp lại, hệ thống đảm bảo:"));
children.push(bullet([run("Hội tụ mạnh (strong eventual consistency): ", { bold: true }), run("hai bản sao nhận cùng tập update sẽ có trạng thái giống hệt nhau, nhờ bản chất CRDT của Yjs.")]));
children.push(bullet([run("Không mất dữ liệu: ", { bold: true }), run("thay đổi được giữ ở CRDT cục bộ + IndexedDB (client) và Redis + PostgreSQL (server); Redis có thể lỗi mà không ảnh hưởng tính bền vững.")]));
children.push(bullet([run("Độ trễ thấp: ", { bold: true }), run("thao tác áp dụng ngay cục bộ rồi mới đồng bộ; đường lưu trữ được tách khỏi đường phát update.")]));
children.push(bullet([run("Chịu lỗi và ngoại tuyến: ", { bold: true }), run("mất mạng hay sự cố Redis đều được xử lý bằng fallback và đồng bộ lại khi phục hồi.")]));
children.push(p("Nhờ kết hợp CRDT (Yjs) cho hòa giải xung đột, WebSocket (Hocuspocus) cho truyền tải thời gian thực và lưu trữ hai tầng (Redis + PostgreSQL) cho tốc độ lẫn độ bền, collab-editor đáp ứng trọn vẹn bốn mục tiêu thiết kế đặt ra ở mục 1.1."));

// ---------- build document ----------
const doc = new Document({
  creator: "collab-editor",
  title: "Báo cáo: Kiến trúc & Mô hình đồng bộ",
  styles: {
    default: { document: { run: { font: FONT, size: SIZE, color: BLACK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: SIZE, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: SIZE, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: SIZE, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      { reference: "nums", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      { reference: "nums2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Trang ", font: FONT, size: 20, color: "555555" }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20, color: "555555" })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("../BaoCao_KienTruc_DongBo.docx", buf);
  console.log("WROTE ../BaoCao_KienTruc_DongBo.docx", buf.length, "bytes");
});
