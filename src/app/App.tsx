import { RouterProvider } from 'react-router';
import { router } from './appRoutes';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MultiBackend, TouchTransition, MouseTransition } from 'react-dnd-multi-backend';

const HTML5toTouch = {
  backends: [
    { id: 'html5', backend: HTML5Backend, transition: MouseTransition },
    { id: 'touch', backend: TouchBackend, options: { enableMouseEvents: true, delayTouchStart: 200 }, transition: TouchTransition, preview: true },
  ],
};

function App() {
  return (
    <DndProvider backend={MultiBackend} options={HTML5toTouch}>
      <RouterProvider router={router} />
    </DndProvider>
  );
}

export default App;
