import { useApp } from '../../context/AppContext';

export default function Toast() {
  const { toast } = useApp();
  return (
    <div className={`fixed bottom-[calc(68px+88px+1rem)] left-1/2 -translate-x-1/2 
      bg-s3 text-tx px-4 py-2 rounded-xl text-sm font-medium border border-white/10 
      shadow-[0_8px_28px_rgba(0,0,0,.6)] z-[9999] whitespace-nowrap pointer-events-none
      transition-all duration-200 ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      {toast.msg}
    </div>
  );
}
