export default function Loading() {
  return (
    <div className="public-loading" role="status" aria-live="polite">
      <div className="public-loading__card">
        <span className="public-loading__spinner" aria-hidden="true" />
        <p className="public-loading__text">Đang tải thông tin sản phẩm...</p>
      </div>
    </div>
  );
}
