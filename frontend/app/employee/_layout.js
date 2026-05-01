import { Slot } from 'expo-router';
import AppLayout from '../../components/AppLayout';

export default function EmployeeLayout() {
  return (
    <AppLayout role="employee">
      <Slot />
    </AppLayout>
  );
}
