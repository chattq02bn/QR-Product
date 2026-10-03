/**
 * Khai báo module side-effect mà Next.js tự xử lý lúc build.
 * TypeScript (đặc biệt VS Code) không tự biết file .css là module nên báo lỗi
 * "Cannot find module or type declarations for side-effect import".
 */
declare module '*.css';
