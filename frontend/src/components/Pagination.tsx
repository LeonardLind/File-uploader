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
    <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
          currentPage === 1
            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
            : "bg-neutral-800 text-slate-200 hover:bg-neutral-700"
        }`}
      >
        Previous
      </button>

      {renderPageNumbers()}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
          currentPage === totalPages
            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
            : "bg-neutral-800 text-slate-200 hover:bg-neutral-700"
        }`}
      >
        Next
      </button>
    </div>
  );
}
