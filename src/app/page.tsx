import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to the default PDF (prospectus)
  redirect('/prospectus/1')
}
