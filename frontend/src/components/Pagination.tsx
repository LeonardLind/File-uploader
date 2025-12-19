type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }

    return pages.map((p, i) =>
      typeof p === "number" ? (
        <button
          key={i}
          onClick={() => onPageChange(p)}
          className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
            p === currentPage ? "bg-lime-400 text-black" : "bg-neutral-800 text-slate-200 hover:bg-neutral-700"
          }`}
        >
          {p}
        </button>
      ) : (
        <span key={i} className="px-2 text-slate-500 text-sm">
          {p}
        </span>
      )
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`flex items-center justify-center h-8 w-8 rounded-full border text-slate-200 transition ${
          currentPage === 1
            ? "border-slate-800 text-slate-600 cursor-not-allowed"
            : "border-slate-700 hover:border-lime-400 hover:text-lime-300"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            d="M15 18L9 12L15 6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {renderPageNumbers()}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`flex items-center justify-center h-8 w-8 rounded-full border text-slate-200 transition ${
          currentPage === totalPages
            ? "border-slate-800 text-slate-600 cursor-not-allowed"
            : "border-slate-700 hover:border-lime-400 hover:text-lime-300"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            d="M9 6L15 12L9 18"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
