'use client'

import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfig } from '@/features/config/hooks/use-config'
import { useUpdateConfig } from '@/features/config/hooks/use-update-config'
import { AUTOMATIC_LOCALE, localeNames, locales } from '@/i18n/locale'

const parse = (value: string | null) => value || AUTOMATIC_LOCALE

export function LanguageSettings() {
  const t = useTranslations('languageSettings')
  const router = useRouter()
  const { data: selected } = useConfig({ key: 'locale', parser: parse, defaultData: AUTOMATIC_LOCALE })
  const { mutate, isPending } = useUpdateConfig({ parser: parse })

  const handleChange = (value: string) => {
    mutate(
      { key: 'locale', value },
      {
        // The language is picked on the server, so the page has to be rendered again
        onSuccess: () => router.refresh(),
        onError: error => toast.error(error.message)
      }
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <div>
        <h3 className='text-sm font-semibold'>{t('title')}</h3>
        <p className='text-xs text-muted-foreground'>{t('description')}</p>
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='language-select'>{t('label')}</Label>
        <Select value={selected ?? AUTOMATIC_LOCALE} onValueChange={handleChange} disabled={isPending}>
          <SelectTrigger id='language-select' className='w-56'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AUTOMATIC_LOCALE}>{t('automatic')}</SelectItem>
            {locales.map(locale => (
              <SelectItem key={locale} value={locale}>
                {localeNames[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
