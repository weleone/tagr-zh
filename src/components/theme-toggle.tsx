'use client'

import { MoonIcon, SunIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useConfig } from '@/features/config/hooks/use-config'
import { useUpdateConfig } from '@/features/config/hooks/use-update-config'

type Theme = 'dark' | 'light'

const parseTheme = (value: string | null): Theme => (value === 'light' ? 'light' : 'dark')

export function ThemeToggle() {
  const t = useTranslations('themeToggle')
  const router = useRouter()
  const { data: theme } = useConfig({ key: 'theme', parser: parseTheme, defaultData: 'dark' })
  const { mutate, isPending } = useUpdateConfig({ parser: parseTheme })

  const isDark = (theme ?? 'dark') === 'dark'

  const handleToggle = () => {
    mutate(
      { key: 'theme', value: isDark ? 'light' : 'dark' },
      {
        // The theme class is picked on the server, so the page has to be rendered again
        onSuccess: () => router.refresh(),
        onError: error => toast.error(error.message)
      }
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant='ghost' size='icon' className='h-8 w-8' onClick={handleToggle} disabled={isPending}>
          {isDark ? <SunIcon className='h-4 w-4' /> : <MoonIcon className='h-4 w-4' />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isDark ? t('switchToLight') : t('switchToDark')}</TooltipContent>
    </Tooltip>
  )
}
