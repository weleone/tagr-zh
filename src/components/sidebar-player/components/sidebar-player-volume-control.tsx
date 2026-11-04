'use client'

import { Volume1Icon, Volume2Icon, VolumeXIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { usePlayerStore } from '@/stores/player-store'

export function SidebarPlayerVolumeControl() {
  const t = useTranslations('playback')
  const volume = usePlayerStore(s => s.volume)
  const setVolume = usePlayerStore(s => s.setVolume)

  const percent = Math.round(volume * 100)
  const VolumeIcon = percent === 0 ? VolumeXIcon : percent < 50 ? Volume1Icon : Volume2Icon

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6 text-muted-foreground/70 hover:text-foreground'
          aria-label={t('volume')}>
          <VolumeIcon className='h-3 w-3' />
        </Button>
      </PopoverTrigger>
      <PopoverContent side='top' className='w-48' aria-label={t('volume')}>
        <div className='flex items-center gap-3'>
          <Slider value={[percent]} max={100} step={1} onValueChange={([value]) => setVolume(value / 100)} />
          <span className='w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground'>{percent}%</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
