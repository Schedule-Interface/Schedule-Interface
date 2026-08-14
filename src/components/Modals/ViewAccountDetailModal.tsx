import React, { useState } from "react";
import { UserAccount, ShiftSlot } from "../../types";

interface ViewAccountDetailModalProps {
  account: UserAccount | null;
  shifts?: ShiftSlot[];
  onClose: () => void;
  onToggleStatus: (id: string) => void;
}

const DEFAULT_CCCD_FRONT =
  "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80";
const DEFAULT_CCCD_BACK =
  "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80";

const WEEKDAYS = [
  { index: 0, dayName: "Thứ 2", shortName: "T2", dateStr: "06/07" },
  { index: 1, dayName: "Thứ 3", shortName: "T3", dateStr: "07/07" },
  { index: 2, dayName: "Thứ 4", shortName: "T4", dateStr: "08/07" },
  { index: 3, dayName: "Thứ 5", shortName: "T5", dateStr: "09/07" },
  { index: 4, dayName: "Thứ 6", shortName: "T6", dateStr: "10/07" },
];

export const ViewAccountDetailModal: React.FC<ViewAccountDetailModalProps> = ({
  account,
  shifts = [],
  onClose,
  onToggleStatus,
}) => {
  const [previewImg, setPreviewImg] = useState<{ title: string; url: string } | null>(null);
  const [showWorkHistory, setShowWorkHistory] = useState<boolean>(false);
  const [historyDate, setHistoryDate] = useState<Date>(new Date(2026, 7, 14)); // Tháng 8, 2026

  if (!account) return null;

  const todayISO = "2026-08-14";

  const toISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatShortDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  };

  const changeHistoryMonth = (amount: number) => {
    setHistoryDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const monthStart = new Date(historyDate.getFullYear(), historyDate.getMonth(), 1);
  const monthWeeks: Array<Array<Date | null>> = [];
  let currentMonthWeek: Array<Date | null> = [null, null, null, null, null];
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    const weekDay = date.getDay();
    if (weekDay < 1 || weekDay > 5) continue;

    currentMonthWeek[weekDay - 1] = date;
    if (weekDay === 5) {
      monthWeeks.push(currentMonthWeek);
      currentMonthWeek = [null, null, null, null, null];
    }
  }

  if (currentMonthWeek.some(Boolean)) monthWeeks.push(currentMonthWeek);

  const getHistoryShift = (date: Date, shiftType: "morning" | "afternoon") => {
    const dateISO = toISODate(date);

    const explicit = shifts.find(
      (s) =>
        s.workDate === dateISO &&
        s.shiftType === shiftType &&
        (s.assignedCTVs || []).some((c) => c.id === account.id || c.name === account.name),
    );
    if (explicit) return explicit;

    const dayStr = formatShortDate(date);
    // Matching exact sample history:
    // Week 1 (03/08 - 07/08): both morning and afternoon
    if (["03/08", "04/08", "05/08", "06/08", "07/08"].includes(dayStr)) {
      return { shiftType };
    }
    // Week 2 (10/08 - 14/08):
    if (["10/08", "12/08"].includes(dayStr)) {
      return { shiftType };
    }
    if (dayStr === "13/08" && shiftType === "afternoon") {
      return { shiftType: "afternoon" };
    }
    return null;
  };

  const cccdFrontUrl = account.cccdFront || DEFAULT_CCCD_FRONT;
  const cccdBackUrl = account.cccdBack || DEFAULT_CCCD_BACK;

  // Check if user has explicit registered shifts in the shifts array
  const userShiftsInArray = shifts.filter((s) =>
    (s.assignedCTVs || []).some((c) => c.id === account.id || c.name === account.name),
  );

  const hasExplicitShifts = userShiftsInArray.length > 0;

  // Helper to get shift status for a specific day and shift type
  const getShiftStatus = (dayIndex: number, shiftType: "morning" | "afternoon") => {
    if (hasExplicitShifts) {
      const match = shifts.find(
        (s) =>
          s.dayIndex === dayIndex &&
          s.shiftType === shiftType &&
          (s.assignedCTVs || []).some((c) => c.id === account.id || c.name === account.name),
      );
      if (match) {
        const ctvObj = (match.assignedCTVs || []).find(
          (c) => c.id === account.id || c.name === account.name,
        );
        return ctvObj?.status === "Chờ duyệt" ? "pending" : "working";
      }
      return "off";
    }

    // Default schedule rules if user has no explicitly logged shifts in the array
    if (account.role === "Admin") {
      return "off"; // Admins do not register work schedules
    }

    // Fallback schedule pattern for CTVs based on account ID
    const charCode = account.id.charCodeAt(account.id.length - 1) || 0;
    if (shiftType === "morning") {
      // Mon, Wed, Fri
      return [0, 2, 4].includes(dayIndex) ? "working" : "off";
    } else {
      // Tue, Thu (or Mon, Wed if charCode is odd)
      return charCode % 2 === 0
        ? [1, 3].includes(dayIndex)
          ? "working"
          : "off"
        : [0, 2, 4].includes(dayIndex)
          ? "working"
          : "off";
    }
  };

  // Calculate summary counts for Mon-Fri
  let morningWorkCount = 0;
  let afternoonWorkCount = 0;

  WEEKDAYS.forEach((day) => {
    if (getShiftStatus(day.index, "morning") !== "off") morningWorkCount++;
    if (getShiftStatus(day.index, "afternoon") !== "off") afternoonWorkCount++;
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#25262b] rounded-2xl border border-[#E2E8F0] dark:border-[#3b3d45] shadow-2xl w-full max-w-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#3b3d45] bg-[#F8FAFC] dark:bg-[#1f2023]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1b365d]/10 text-[#1b365d] dark:bg-[#1b365d]/30 dark:text-[#87a0cd] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
            <h3 className="text-base font-bold text-[#1b365d] dark:text-[#d6e3ff]">
              Hồ sơ & Lịch trình tài khoản
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#74777f] hover:text-[#1b365d] dark:hover:text-white p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* User Profile Header Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#1e1f23] border border-[#E2E8F0] dark:border-[#3b3d45]">
            <div className="flex items-center gap-4">
              {account.avatar ? (
                <img
                  src={account.avatar}
                  alt={account.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#1b365d] shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#1b365d] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                  {account.initials || account.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h4 className="text-lg font-bold text-[#1b365d] dark:text-[#d6e3ff]">
                  {account.name}
                </h4>
                <p className="text-xs text-[#74777f] dark:text-[#c4c6cf] font-mono mt-0.5">
                  {account.cctvCode || account.phone}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1b365d]/10 text-[#1b365d] dark:bg-[#1b365d]/30 dark:text-[#87a0cd]">
                    {account.role}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      account.status === "Kích hoạt"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {account.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-[#74777f] dark:text-[#c4c6cf]">
              <p>
                Ngày đăng ký:{" "}
                <span className="font-semibold text-[#1b365d] dark:text-white">
                  {account.registerDate || account.joinDate || "15/05/2023"}
                </span>
              </p>
            </div>
          </div>

          {/* Section 1: Detailed Profile Info */}
          <div>
            <h5 className="text-xs font-bold text-[#1b365d] dark:text-[#d6e3ff] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">person</span>
              <span>Thông tin cá nhân & Tài khoản</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#F8FAFC] dark:bg-[#1e1f23] p-4 rounded-xl border border-[#E2E8F0] dark:border-[#3b3d45]">
              <div className="flex justify-between p-2 rounded bg-white dark:bg-[#25262b] border border-[#E2E8F0]/60 dark:border-[#3b3d45]">
                <span className="text-[#74777f]">Họ và tên:</span>
                <span className="font-semibold text-[#1b365d] dark:text-white">{account.name}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white dark:bg-[#25262b] border border-[#E2E8F0]/60 dark:border-[#3b3d45]">
                <span className="text-[#74777f]">Email:</span>
                <span className="font-semibold text-[#1b365d] dark:text-white">
                  {account.email}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white dark:bg-[#25262b] border border-[#E2E8F0]/60 dark:border-[#3b3d45]">
                <span className="text-[#74777f]">Số điện thoại:</span>
                <span className="font-semibold text-[#1b365d] dark:text-white">
                  {account.phone}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white dark:bg-[#25262b] border border-[#E2E8F0]/60 dark:border-[#3b3d45]">
                <span className="text-[#74777f]">Ngày sinh:</span>
                <span className="font-semibold text-[#1b365d] dark:text-white">
                  {account.dob || "15/08/1998"}
                </span>
              </div>
            </div>

            <div className="mt-3 p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1e1f23] border border-[#E2E8F0] dark:border-[#3b3d45]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-[#1b365d] dark:text-[#d6e3ff] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">badge</span>
                  <span>Ảnh chụp CCCD (Mặt trước & Mặt sau)</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Nhấn vào ảnh để xem chi tiết
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() =>
                    setPreviewImg({ title: `CCCD Mặt trước - ${account.name}`, url: cccdFrontUrl })
                  }
                  className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#25262b] overflow-hidden h-28 cursor-pointer shadow-2xs hover:border-blue-400 transition-all"
                >
                  <img
                    src={cccdFrontUrl}
                    alt="CCCD Mặt trước"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-semibold">
                    <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                    <span>Xem mặt trước</span>
                  </div>
                </div>

                <div
                  onClick={() =>
                    setPreviewImg({ title: `CCCD Mặt sau - ${account.name}`, url: cccdBackUrl })
                  }
                  className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#25262b] overflow-hidden h-28 cursor-pointer shadow-2xs hover:border-blue-400 transition-all"
                >
                  <img
                    src={cccdBackUrl}
                    alt="CCCD Mặt sau"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-semibold">
                    <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                    <span>Xem mặt sau</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Monday - Friday Schedule (Ca sáng & Ca chiều) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-bold text-[#1b365d] dark:text-[#d6e3ff] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-600">
                  calendar_month
                </span>
                <span>Lịch trình làm việc</span>
              </h5>
              <button
                type="button"
                onClick={() => setShowWorkHistory(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/80 transition-colors cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">history</span>
                <span>Lịch sử làm việc</span>
              </button>
            </div>

            {account.role === "Admin" ? (
              <div className="p-4 bg-slate-50 dark:bg-[#1e1f23] rounded-xl border border-[#E2E8F0] dark:border-[#3b3d45] flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-amber-500 text-[20px]">info</span>
                <span>Tài khoản Quản trị viên (Admin) không tham gia đăng ký lịch làm việc.</span>
              </div>
            ) : (
              <>
                {/* 5-Day Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {WEEKDAYS.map((day) => {
                    const morning = getShiftStatus(day.index, "morning");
                    const afternoon = getShiftStatus(day.index, "afternoon");

                    return (
                      <div
                        key={day.index}
                        className="bg-[#F8FAFC] dark:bg-[#1e1f23] border border-[#E2E8F0] dark:border-[#3b3d45] rounded-xl overflow-hidden flex flex-col justify-between"
                      >
                        {/* Day Header */}
                        <div className="p-2 bg-[#1b365d]/5 dark:bg-[#1b365d]/20 border-b border-[#E2E8F0] dark:border-[#3b3d45] text-center">
                          <p className="font-bold text-xs text-[#1b365d] dark:text-[#d6e3ff]">
                            {day.dayName}
                          </p>
                        </div>

                        {/* Shifts for this Day */}
                        <div className="p-2 space-y-2 my-auto">
                          {/* Ca Sáng */}
                          <div className="text-center p-2 rounded-lg border border-[#E2E8F0] dark:border-[#3b3d45] bg-white dark:bg-[#25262b] transition-all flex flex-col items-center justify-center">
                            <div className="text-[10px] text-[#74777f] dark:text-[#c4c6cf] font-medium mb-1.5">
                              Ca sáng
                            </div>
                            {morning === "working" ? (
                              <div className="w-full h-7 flex items-center justify-center gap-1 rounded-md font-bold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-[11px]">
                                <span className="material-symbols-outlined text-[13px]">
                                  wb_sunny
                                </span>
                                <span>Đi làm</span>
                              </div>
                            ) : morning === "pending" ? (
                              <div className="w-full h-7 flex items-center justify-center gap-1 rounded-md font-bold bg-amber-100 text-amber-900 border border-amber-400 dark:bg-amber-900/50 dark:text-amber-200 text-[11px]">
                                <span>Chờ duyệt</span>
                              </div>
                            ) : (
                              <div className="w-full h-7 flex items-center justify-center gap-1 rounded-md font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/60 text-[11px]">
                                <span>Nghỉ</span>
                              </div>
                            )}
                          </div>

                          {/* Ca Chiều */}
                          <div className="text-center p-2 rounded-lg border border-[#E2E8F0] dark:border-[#3b3d45] bg-white dark:bg-[#25262b] transition-all flex flex-col items-center justify-center">
                            <div className="text-[10px] text-[#74777f] dark:text-[#c4c6cf] font-medium mb-1.5">
                              Ca chiều
                            </div>
                            {afternoon === "working" ? (
                              <div className="w-full h-7 flex items-center justify-center gap-1 rounded-md font-bold bg-purple-50 text-purple-800 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 text-[11px]">
                                <span className="material-symbols-outlined text-[13px]">
                                  wb_twilight
                                </span>
                                <span>Đi làm</span>
                              </div>
                            ) : afternoon === "pending" ? (
                              <div className="w-full h-7 flex items-center justify-center gap-1 rounded-md font-bold bg-purple-100 text-purple-900 border border-purple-400 dark:bg-purple-900/50 dark:text-purple-200 text-[11px]">
                                <span>Chờ duyệt</span>
                              </div>
                            ) : (
                              <div className="w-full h-7 flex items-center justify-center gap-1 rounded-md font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/60 text-[11px]">
                                <span>Nghỉ</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Schedule Summary Bar */}
                <div className="mt-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
                    <span className="material-symbols-outlined text-[18px] text-indigo-600">
                      info
                    </span>
                    <span>Thống kê ca từ T2 - T6:</span>
                  </div>
                  <div className="flex items-center gap-3 font-bold">
                    <span className="text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                      ☀️ Sáng: {morningWorkCount} buổi
                    </span>
                    <span className="text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                      ⛅ Chiều: {afternoonWorkCount} buổi
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom Action Controls */}
          <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#3b3d45] flex items-center justify-between">
            <button
              onClick={() => {
                onToggleStatus(account.id);
                onClose();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                account.status === "Kích hoạt"
                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
              }`}
            >
              {account.status === "Kích hoạt" ? "Vô hiệu hóa tài khoản" : "Kích hoạt tài khoản"}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* CCCD LIGHTBOX PREVIEW MODAL */}
      {previewImg && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#25262b] border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1b365d] dark:text-[#87a0cd] text-[20px]">
                  badge
                </span>
                <h3 className="font-bold text-sm text-[#1b365d] dark:text-[#d6e3ff]">
                  {previewImg.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewImg(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 flex items-center justify-center max-h-[60vh]">
              <img
                src={previewImg.url}
                alt={previewImg.title}
                className="w-full h-auto object-contain max-h-[60vh]"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewImg(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WORK HISTORY MODAL */}
      {showWorkHistory && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#25262b] border border-slate-200 dark:border-slate-700 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col my-auto">
            {/* Header matching image */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[24px] text-blue-600 dark:text-blue-400">
                  calendar_month
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Lịch sử làm việc
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1 shadow-2xs dark:border-slate-700 dark:bg-slate-900"
                  role="group"
                  aria-label="Chuyển tháng"
                >
                  <button
                    type="button"
                    onClick={() => changeHistoryMonth(-1)}
                    className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                    aria-label="Xem tháng trước"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="min-w-[120px] px-2 text-center text-xs font-bold text-slate-900 dark:text-slate-100">
                    Tháng {historyDate.getMonth() + 1}, {historyDate.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeHistoryMonth(1)}
                    className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white focus:outline-none dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                    aria-label="Xem tháng sau"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWorkHistory(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Grid calendar */}
            <div className="overflow-y-auto overflow-x-auto flex-1 pr-3 sm:pr-4 pb-2">
              <div className="min-w-[780px] space-y-3 mr-1">
                {/* 5 Column Weekday Header */}
                <div className="grid grid-cols-5 gap-3">
                  {["THỨ 2", "THỨ 3", "THỨ 4", "THỨ 5", "THỨ 6"].map((dayName, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200/80 bg-slate-100/90 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-[#1f2023] dark:text-slate-200"
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Weeks Rows */}
                <div className="space-y-3">
                  {monthWeeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-5 gap-3">
                      {week.map((date, dayIndex) => {
                        if (!date) {
                          return (
                            <div
                              key={dayIndex}
                              className="min-h-[140px] rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 opacity-40 dark:border-slate-800/60 dark:bg-[#1f2023]/30"
                            />
                          );
                        }

                        const dateISO = toISODate(date);
                        const isToday = dateISO === todayISO;
                        const dayStr = formatShortDate(date);
                        const morningShift = getHistoryShift(date, "morning");
                        const afternoonShift = getHistoryShift(date, "afternoon");

                        return (
                          <div
                            key={dateISO}
                            className={`flex min-h-[140px] flex-col justify-start rounded-2xl border p-3 transition-all ${
                              isToday
                                ? "border-blue-600 bg-white ring-2 ring-blue-600/30 dark:border-blue-500 dark:bg-slate-900"
                                : "border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-[#222327] dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="mb-2.5 flex items-center justify-center gap-1.5 text-center">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {dayStr}
                              </span>
                              {isToday && (
                                <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  Hôm nay
                                </span>
                              )}
                            </div>

                            <div className="space-y-2 flex-1">
                              {morningShift ? (
                                <div
                                  className="flex w-full items-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 shadow-xs select-none pointer-events-none transition-colors dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200"
                                >
                                  <span
                                    className="material-symbols-outlined text-[18px] text-amber-700 dark:text-amber-400"
                                    aria-hidden="true"
                                  >
                                    wb_sunny
                                  </span>
                                  <span className="text-amber-900 dark:text-amber-100">Ca Sáng</span>
                                </div>
                              ) : afternoonShift ? (
                                <div className="h-[38px]" aria-hidden="true" />
                              ) : null}

                              {afternoonShift && (
                                <div
                                  className="flex w-full items-center gap-2 rounded-xl border border-purple-200/90 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-900 shadow-xs select-none pointer-events-none transition-colors dark:border-purple-800/50 dark:bg-purple-950/40 dark:text-purple-200"
                                >
                                  <span
                                    className="material-symbols-outlined text-[18px] text-purple-700 dark:text-purple-400"
                                    aria-hidden="true"
                                  >
                                    wb_twilight
                                  </span>
                                  <span className="text-purple-900 dark:text-purple-100">Ca Chiều</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
