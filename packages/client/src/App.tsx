import { RouterProvider } from 'react-router';
import { router } from './routes.js';
import { Toaster } from 'sonner';

export function App(): React.JSX.Element {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
