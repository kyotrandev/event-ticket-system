# Tech Stack & Technologies Used - Event Ticket System

Tài liệu này tổng hợp toàn bộ các công nghệ, framework và thư viện chính đã được sử dụng để xây dựng dự án Event Ticket System. Dự án áp dụng kiến trúc Monorepo bao gồm 2 phần chính là Backend API và Frontend Web.

---

## 1. Backend (API)
Phần Backend được xây dựng dựa trên [brocoders/nestjs-boilerplate](https://github.com/brocoders/nestjs-boilerplate), tuân thủ chặt chẽ **Kiến trúc Hexagonal (Ports & Adapters)** để đảm bảo tính module hóa và dễ dàng mở rộng.

- **Framework**: Nest.js (Node.js)
- **Ngôn ngữ**: TypeScript
- **Cơ sở dữ liệu (Database)**: PostgreSQL
- **ORM / Tương tác DB**: TypeORM
- **Authentication & Authorization**: 
  - JWT (JSON Web Tokens) với cơ chế Refresh Token Rotation.
  - Passport.js.
  - Google OAuth2 (Theo pattern Token-exchange: Frontend lấy token từ Google -> Gửi cho Backend verify).
  - Role-based Access Control (RBAC) thông qua Guards & Decorators.
- **Hàng đợi & Tác vụ nền (Message Queue & Background Jobs)**: 
  - BullMQ kết hợp với Redis (dùng cho các job như tự động hết hạn vé, gửi email, xử lý danh sách chờ).
- **Thanh toán (Payment Gateway)**: Stripe (Sử dụng PaymentIntents API và Webhooks để lắng nghe trạng thái thanh toán).
- **Email**: Nodemailer kết hợp Handlebars (`.hbs`) để render template HTML.
- **Lưu trữ file (File Storage)**: Cloudinary (Lưu trữ avatar, banner sự kiện) thông qua pattern FileDriver interface.
- **Tạo mã QR & Bảo mật**: Sử dụng package `qrcode` và module `crypto` có sẵn của Node.js (HMAC-SHA256) để chống làm giả vé.
- **API Documentation**: Swagger / OpenAPI (truy cập tại `/docs`).

---

## 2. Frontend (Web)
Phần giao diện người dùng được tối ưu hóa cho SEO và trải nghiệm người dùng hiện đại, sử dụng cơ chế Server Components và Client Components.

- **Framework**: Next.js 15 (App Router)
- **Ngôn ngữ**: TypeScript
- **Styling**: Tailwind CSS
- **Thư viện UI (Component Library)**: Shadcn UI (Radix UI + Tailwind) cho các thành phần như Button, Card, Input, Label, Badge...
- **Giao tiếp API (HTTP Client)**: Native `fetch` API được bọc lại bằng một wrapper custom (`lib/api.ts`) hỗ trợ tự động đính kèm Token và thực hiện Refresh Token Rotation (Single-flight refresh) khi nhận mã lỗi 401.
- **Đăng nhập mạng xã hội**: `@react-oauth/google`.
- **Trạng thái (State Management)**: React Context API (Ví dụ: `AuthContext`).

---

## 3. Infrastructure & DevOps
Môi trường phát triển và triển khai cục bộ được chuẩn hóa thông qua Docker, giúp toàn bộ đội ngũ dev có môi trường nhất quán.

- **Containerization**: Docker & Docker Compose.
- **Các Service trong Docker Compose**:
  - `postgres`: Database chính.
  - `redis`: In-memory data store phục vụ Queue.
  - `maildev`: SMTP Server local dùng để bắt và hiển thị email gửi ra trong môi trường dev.
  - `api`: Container chạy Nest.js.
  - `web`: Container chạy Next.js.
  - `adminer`: UI quản trị Database (nếu cần).
  - `nginx`: Reverse Proxy để định tuyến domain trong production (hoặc mô phỏng production locally).
- **Package Manager**: `npm`.

---

## 4. Design Patterns & Best Practices Chính
- **Hexagonal Architecture (Ports and Adapters)** ở Backend: Tách biệt hoàn toàn Domain Logic với Database Entity.
- **Pessimistic Locking**: Sử dụng trong giao dịch đặt vé (Booking Transaction) bằng TypeORM EntityManager (`lock: { mode: 'pessimistic_write' }`) để ngăn chặn tình trạng Overselling (Bán lố vé) khi có nhiều người đặt cùng lúc.
- **Idempotency**: Áp dụng trong xử lý Stripe Webhook và Check-in (Quét mã QR) để đảm bảo dù hệ thống có gọi lại nhiều lần thì kết quả vẫn nhất quán và không gây lỗi (Ví dụ: Không tạo vé trùng lặp khi nhận 2 webhook thanh toán thành công).
