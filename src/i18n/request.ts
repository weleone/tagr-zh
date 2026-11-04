import { getRequestConfig } from 'next-intl/server'
import { headers } from 'next/headers'
import { auth } from '@/auth'
import { getConfigValue } from '@/features/config/config.repository'
import { resolveLocale } from './locale'

async function getSavedLocale(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ? getConfigValue(session.user.id, 'locale') : null
}

export default getRequestConfig(async () => {
  const acceptLanguage = (await headers()).get('accept-language')
  const locale = resolveLocale(await getSavedLocale(), acceptLanguage)

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  }
})
