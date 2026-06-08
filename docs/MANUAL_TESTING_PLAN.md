# Kế hoạch Kiểm thử Thủ công (Manual Testing Plan) - Event Ticket System

Tài liệu này hướng dẫn chi tiết các bước thực hiện kiểm thử thủ công (manual test) cho toàn bộ hệ thống Event Ticket System theo từng module và role.

---

## 1. Chuẩn bị Môi trường

Trước khi bắt đầu test, hãy đảm bảo hệ thống đã được khởi chạy thành công ở môi trường local.

1. **Khởi chạy hệ thống**: 
   Chạy lệnh `docker compose up -d` tại thư mục gốc. Đảm bảo 4 container (PostgreSQL, Redis, Maildev, API) đang chạy. Khởi chạy cả frontend Web nếu đang chạy riêng.
2. **Cấu hình `.env`**:
   - Kiểm tra API keys của Stripe (Test Mode).
   - Kiểm tra cấu hình Cloudinary cho upload ảnh.
   - Các biến môi trường JWT, QR_HMAC_SECRET.
3. **Các Endpoint phục vụ test**:
   - **Frontend Web**: `http://localhost:3000` (hoặc 3001)
   - **Backend API**: `http://localhost:3000/api/v1`
   - **Swagger Docs**: `http://localhost:3000/docs` (Dùng để test trực tiếp API nếu cần)
   - **Maildev (Email Inbox Test)**: `http://localhost:1080` (Dùng để nhận toàn bộ email của hệ thống)

---

## 2. Kịch bản Kiểm thử theo Module

### Phase 1: Authentication & User Management
Mục tiêu: Đảm bảo các luồng đăng ký, đăng nhập và phân quyền hoạt động đúng.

- **[ ] Đăng ký Customer**: Đăng ký một tài khoản Customer mới bằng Email/Password. Kiểm tra Maildev xem có nhận được email xác nhận không.
- **[ ] Validation Đăng ký**: Cố tình nhập mật khẩu < 8 ký tự, hoặc không có số/chữ hoa. Hệ thống phải báo lỗi (400).
- **[ ] Đăng nhập Customer**: Đăng nhập bằng tài khoản vừa tạo. Kiểm tra xem có nhận được JWT token không.
- **[ ] Google OAuth**: Đăng nhập qua Google. Đảm bảo tài khoản tự động được tạo/merge và gán role Customer.
- **[ ] Đăng ký Organizer**: Đăng ký một tài khoản với role Organizer. Cố gắng đăng nhập ngay sau đó -> Phải nhận lỗi `403: Account pending approval`.
- **[ ] Admin Duyệt Organizer**: Dùng tài khoản Admin (từ seeder), duyệt tài khoản Organizer vừa đăng ký. Organizer sau đó đăng nhập thành công và nhận được email phê duyệt.
- **[ ] Quản lý User (Admin)**: Admin khóa (Lock) một tài khoản. Đăng nhập bằng tài khoản đó -> Báo lỗi `403 Account is locked`.

### Phase 2: Event & Ticket Management (Role: Organizer)
Mục tiêu: Đảm bảo Organizer có thể tạo, chỉnh sửa và quản lý sự kiện, loại vé.

- **[ ] Tạo Event**: Đăng nhập Organizer, tạo một Event mới với ngày bắt đầu ở tương lai. Kiểm tra tải lên banner (Cloudinary). Event phải ở trạng thái `DRAFT`.
- **[ ] Validation Event**: Thử tạo event với ngày bắt đầu trong quá khứ hoặc ngày kết thúc trước ngày bắt đầu -> Phải báo lỗi.
- **[ ] Tạo Ticket Type**: Tạo 2 loại vé cho event vừa tạo: 1 loại Miễn phí (Price = 0) và 1 loại Có phí (Price > 0). Thiết lập số lượng và thời gian mở bán.
- **[ ] Validation Ticket Type**: Sửa số lượng tổng (totalQty) nhỏ hơn số lượng đã bán -> Phải báo lỗi.
- **[ ] Publish Event**: Chuyển trạng thái event sang `PUBLISHED`. (Thử publish khi chưa có loại vé nào -> Phải báo lỗi).
- **[ ] Hủy Event**: Thử hủy một event đang `PUBLISHED`. Kiểm tra xem vé đã bán có được tự động hoàn tiền qua Stripe và gửi email thông báo hủy không.

### Phase 3: Booking & Payment (Role: Customer)
Mục tiêu: Kiểm tra luồng tìm kiếm, đặt vé, giữ chỗ và thanh toán.

- **[ ] Browse & Search**: Vào trang chủ (chưa đăng nhập), tìm kiếm event theo tên, lọc theo category và thời gian. Đảm bảo các event `DRAFT` hoặc `CANCELLED` không hiện ra.
- **[ ] Đặt chỗ (Giữ chỗ)**: Đăng nhập Customer, chọn vé và số lượng, bấm đặt. Hệ thống phải tạo booking `PENDING_PAYMENT` và trừ đi inventory (reservedQty).
- **[ ] Hết vé (Oversell Protection)**: Đặt số lượng vé lớn hơn số vé còn lại -> Phải báo lỗi.
- **[ ] Sử dụng Promo Code**: Nhập mã giảm giá (Percent hoặc Fixed). Kiểm tra số tiền tổng (totalAmount) được tính lại chính xác.
- **[ ] Thanh toán Stripe (Thành công)**: Sử dụng test card của Stripe (`4242 4242 4242 4242`) để thanh toán. Kiểm tra:
  - Booking chuyển sang `PAID`.
  - Vé (Ticket) được tạo ra.
  - Email vé đính kèm file PDF QR Code xuất hiện ở Maildev.
- **[ ] Thanh toán hết hạn (Expiry)**: Tạo một booking nhưng KHÔNG thanh toán. Chờ 15 phút. Kiểm tra xem booking có tự chuyển sang `EXPIRED` và số lượng giữ chỗ có được trả lại hệ thống không.

### Phase 4: Check-in System (Role: Staff / Organizer)
Mục tiêu: Đảm bảo việc kiểm soát vé tại cổng hoạt động chính xác và bảo mật.

- **[ ] Gán Staff**: Organizer chỉ định một user (Role: Staff) vào event của mình.
- **[ ] Quét QR Thành công**: Đăng nhập Staff, mở màn hình Check-in, quét mã QR hợp lệ từ PDF vé. Hệ thống phải hiện `VALID`, thông tin khách và chuyển trạng thái vé sang `USED`.
- **[ ] Chống quét lại (Re-use)**: Quét lại chính mã QR vừa nãy. Hệ thống phải hiện `ALREADY USED` kèm thời gian check-in lần đầu và tên nhân viên quét.
- **[ ] Chống làm giả QR**: Cố tình tạo một QR code giả với Ticket Code có trong DB nhưng sai HMAC Signature. Quét thử -> Hệ thống phải chặn và báo `INVALID TICKET`.
- **[ ] Check-in Thủ công**: Nhập mã UUID của vé bằng tay (trong trường hợp QR rách). Kiểm tra luồng hoạt động tương tự quét QR.
- **[ ] Log Check-in**: Đăng nhập Organizer, vào xem lịch sử Check-in realtime xem có lưu đủ log không.

### Phase 5: Cancellation, Refund & Waitlist
Mục tiêu: Khách hàng tự hủy vé, hoàn tiền và cơ chế danh sách chờ hoạt động trơn tru.

- **[ ] Hủy vé (Trong thời hạn)**: Customer vào lịch sử vé, bấm hủy một booking `PAID` (còn nằm trong cancellationWindow). Kiểm tra: tiền hoàn lại vào thẻ Stripe, trạng thái vé `CANCELLED`, nhận email xác nhận.
- **[ ] Hủy vé (Quá hạn)**: Thử hủy vé khi thời gian hiện tại đã sát giờ diễn (vượt quá cancellation window) -> Phải bị chặn và báo lỗi 403.
- **[ ] Đăng ký Waitlist**: Customer 1 mua hết số vé của một loại (SOLD OUT). Customer 2 vào bấm nút "Tham gia Waitlist".
- **[ ] Kích hoạt Waitlist**: Customer 1 hủy vé (hoặc booking bị expire). Hệ thống phải gửi email thông báo có vé cho Customer 2.
- **[ ] Waitlist Fulfillment**: Customer 2 click link trong email và mua vé thành công trong 48h. (Nếu sau 48h không mua, vé nhả cho người tiếp theo).

### Phase 6: Analytics & Admin Panel
Mục tiêu: Đảm bảo số liệu thống kê chính xác.

- **[ ] Organizer Analytics**: Vào dashboard Organizer. Kiểm tra số lượng vé đã bán, tỉ lệ check-in và **Doanh thu**. (Lưu ý: Doanh thu phải trừ đi số tiền của các vé đã bị Refund).
- **[ ] Admin Stats**: Đăng nhập Admin, xem thống kê toàn hệ thống (Tổng user, sự kiện, doanh thu tổng).
- **[ ] Quản lý Promo Code**: Admin tạo/xóa mã Promo Code toàn cục. Cố tình nhập trùng mã Code -> Hệ thống phải báo lỗi (409).

---

## 3. Edge Cases & Concurrency (Nâng cao)

Dành cho Developer / QA muốn test độ bền của hệ thống (Race Conditions):

- **[ ] Đặt trùng vé (Concurrency)**: Mở 2 tab trình duyệt ẩn danh (2 user khác nhau). Cùng vào 1 event chỉ còn ĐÚNG 1 VÉ. Cả 2 cùng bấm "Book" một lúc. Phải có 1 người thành công và 1 người bị lỗi "Hết vé". (Kiểm tra pessimistic locking).
- **[ ] Idempotency Thanh toán**: Kích hoạt webhook `payment_intent.succeeded` của Stripe 2 lần cho cùng 1 payment. Hệ thống chỉ được phát hành vé 1 lần duy nhất, không tạo ra vé trùng lặp.
- **[ ] Idempotency Refund**: Gửi webhook `charge.refund.updated` nhiều lần. Hệ thống không được lỗi và giữ nguyên trạng thái Refund.

---

### Ghi chú khi thực hiện test:
- Đối với các chức năng yêu cầu Email, luôn mở sẵn **Maildev (`http://localhost:1080`)** để bắt và đọc email test.
- Sử dụng thẻ test của Stripe để bypass bước nhập thẻ thật.
- Các job Delay như Expiry Booking (15 phút) hay Waitlist (48 giờ) có thể đổi cấu hình thời gian trong file `.env` hoặc code local xuống 1-2 phút để test cho nhanh mà không phải chờ đợi.
