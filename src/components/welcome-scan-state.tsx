'use client'

import { ArrowRightLeftIcon, Loader2Icon, ScanSearchIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import NextImage from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TransferModal } from '@/components/transfer-modal/transfer-modal'
import { useScan } from '@/features/scan/hooks/use-scan'

export function WelcomeScanState() {
  const t = useTranslations('welcome')
  const router = useRouter()
  const { mutate: scan, isPending } = useScan()
  const [transferOpen, setTransferOpen] = useState(false)

  const handleScan = () => {
    scan({}, {
      onSuccess: () => router.refresh()
    })
  }

  return (
    <div className='flex flex-col items-center justify-center h-screen text-center p-8'>
      <Card className='max-w-md'>
        <CardContent className='pt-6'>
          <NextImage
            src='/icons/tagr-logo.webp'
            alt='Tagr'
            width={64}
            height={64}
            className='mx-auto rounded-xl mb-4'
            unoptimized
          />
          <h1 className='text-xl font-semibold mb-2'>{t('title')}</h1>
          <p className='text-sm text-muted-foreground mb-2'>{t('description')}</p>
          <p className='text-sm text-muted-foreground mb-6'>{t('timing')}</p>
          <div className='flex flex-col items-center gap-3'>
            <Button size='lg' onClick={handleScan} disabled={isPending}>
              {isPending ? <Loader2Icon className='h-4 w-4 animate-spin' /> : <ScanSearchIcon className='h-4 w-4' />}
              {isPending ? t('scanning') : t('scanButton')}
            </Button>
            <Button size='lg' variant='outline' onClick={() => setTransferOpen(true)}>
              <ArrowRightLeftIcon className='h-4 w-4' />
              {t('transferButton')}
            </Button>
            <p className='text-xs text-muted-foreground'>{t('transferHint')}</p>
          </div>
          <p className='text-xs text-muted-foreground mt-6'>{t('insightsNotice')}</p>
        </CardContent>
      </Card>
      <TransferModal
        open={transferOpen}
        onOpenChange={open => {
          setTransferOpen(open)
          if (!open) router.refresh()
        }}
      />
    </div>
  )
}
