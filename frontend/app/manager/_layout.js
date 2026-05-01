import { Slot } from 'expo-router';
import AppLayout from '../../components/AppLayout';

export default function ManagerLayout() {
  return (
    <AppLayout role="manager">
      <Slot />
    </AppLayout>
  );
}
