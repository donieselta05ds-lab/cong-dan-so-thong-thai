/* =========================================================
   CẤU HÌNH – Công dân số thông thái
   ========================================================= */

/* Link Web App của Google Apps Script (bảng xếp hạng chung).
   Dán link dạng https://script.google.com/macros/s/..../exec vào giữa hai dấu ngoặc kép.
   Để trống "" thì game vẫn chạy, nhưng bảng xếp hạng chỉ lưu trên máy đang chơi (để chạy thử). */
const LB_URL = "https://script.google.com/macros/s/AKfycbxjZFadCyf0WgqleUukOBoeMNbyTl3EgIa8ZyELt-OO5DOnbGcrvI-3FNYoj8jJpVCl/exec";

/* Số người hiện trên bảng xếp hạng */
const LB_TOP = 10;

/* 50 khu phố theo Nghị quyết số 12/NQ-HĐND ngày 22/6/2026 của HĐND phường Gia Định
   (số thứ tự không liên tục – giữ đúng số theo Nghị quyết) */
const KP_SO = [1,2,4,5,6,8,9,10,11,12,13,16,17,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,37,39,40,41,43,44,45,47,48,49,51,52,53,54,55,56,57,58,59,60,61,62];
