
export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-[2rem] p-4 flex gap-4 border border-gray-100 shadow-sm animate-pulse">
      <div className="flex-1 flex flex-col justify-between py-1 text-right overflow-hidden">
        <div>
          <div className="flex justify-between items-start">
            <div className="h-2 w-16 bg-gray-100 rounded-full"></div>
            <div className="h-6 w-6 bg-gray-100 rounded-full"></div>
          </div>
          <div className="h-4 w-3/4 bg-gray-100 rounded-full mt-4"></div>
          <div className="h-3 w-1/2 bg-gray-100 rounded-full mt-2"></div>
          
          <div className="flex items-center gap-2 mt-2">
            <div className="h-3 w-12 bg-gray-50 rounded-full"></div>
            <div className="h-3 w-8 bg-gray-50 rounded-full"></div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="h-6 w-20 bg-gray-100 rounded-full"></div>
          <div className="flex gap-1">
            <div className="h-6 w-6 bg-gray-50 rounded-lg"></div>
            <div className="h-6 w-6 bg-gray-50 rounded-lg"></div>
          </div>
        </div>
      </div>
      <div className="w-[110px] h-[110px] rounded-[1.8rem] bg-gray-100 shrink-0"></div>
    </div>
  );
}
