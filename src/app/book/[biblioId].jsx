import { Redirect, useLocalSearchParams } from 'expo-router';

export default function BookRedirect() {
  const { biblioId } = useLocalSearchParams();
  return <Redirect href={{ pathname: '/book-detail', params: { biblioId } }} />;
}
