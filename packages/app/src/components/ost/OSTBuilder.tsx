import { Header } from './Header';
import { Canvas } from './Canvas';
import { Sidebar } from './Sidebar';
import { useOSTStore } from '@/store/ostStore';

export function OSTBuilder() {
  const { selectedCardId } = useOSTStore();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex-1 relative overflow-hidden">
        <Canvas />
        {selectedCardId && <Sidebar />}
      </div>
    </div>
  );
}
