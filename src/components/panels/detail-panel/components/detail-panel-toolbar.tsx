'use client'

import {
  EllipsisVerticalIcon,
  HistoryIcon,
  ImageDownIcon,
  ImageUpIcon,
  RefreshCwIcon,
  Share2Icon,
  EyeDashedIcon,
  TrashIcon,
  XIcon
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import type { UserRole } from '@/features/users/domain'
import { hasMinimumRole } from '@/features/users/lib/hasMinimumRole'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { HistoryModal } from '@/components/history-modal/history-modal'
import { SettingsModal } from '@/components/settings-modal/settings-modal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Song } from '@/features/songs/domain'
import { useRescanSong } from '@/features/songs/hooks/use-rescan-song'
import { useDeleteSong } from '@/features/songs/hooks/use-delete-song'
import { useSelectedSong } from '@/hooks/use-selected-song'
import MusicBrainzIcon from '@/icons/musicbrainz.svg'
import { toast } from 'sonner'

interface DetailPanelToolbarProps {
  song: Song
  displayTitle: string
  onShare: () => void
  onMusicBrainzLookup: () => void
  onDownloadCover: () => void
  onEditCover: () => void
}

export function DetailPanelToolbar({ song, displayTitle, onShare, onMusicBrainzLookup, onDownloadCover, onEditCover }: DetailPanelToolbarProps) {
  const tHistory = useTranslations('history')
  const tDelete = useTranslations('deleteSong')
  const tMusicBrainz = useTranslations('musicbrainzLookup')
  const tShare = useTranslations('share')
  const tPreviewCard = useTranslations('previewCard')
  const tDetailPanelSettings = useTranslations('detailPanelSettings')
  const { data: session } = useSession()
  const { setSelectedSongId } = useSelectedSong()
  const { mutate: rescanSong, isPending: isRescanning } = useRescanSong()
  const { mutate: deleteSong, isPending: isDeleting } = useDeleteSong()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const canEdit = hasMinimumRole(session?.user?.role as UserRole, 'tagger')

  const handleDelete = () => {
    setDeleteOpen(false)
    deleteSong(song.id, {
      onSuccess: name => {
        toast.success(tDelete('deleted', { name }))
        setSelectedSongId(null)
      },
      onError: e => {
        toast.error(e instanceof Error ? e.message : tDelete('failed'))
      }
    })
  }

  return (
    <>
      <div className='flex items-center p-2'>
        {/* Close button - left side */}
        <Button variant='ghost' size='icon' className='h-9 w-9 md:h-7 md:w-7' onClick={() => setSelectedSongId(null)}>
          <XIcon className='h-5 w-5 md:h-4 md:w-4' />
        </Button>

        <div className='flex-1' />

        {/* Desktop buttons */}
        <div className='hidden md:flex gap-1'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onShare}>
                <Share2Icon className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tShare('tooltip')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => setSettingsOpen(true)}>
                <EyeDashedIcon className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tDetailPanelSettings('tooltip')}</TooltipContent>
          </Tooltip>
          {canEdit && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='icon' className='h-7 w-7' disabled={isRescanning} onClick={() => rescanSong(song.id)}>
                    <RefreshCwIcon className={`h-4 w-4 ${isRescanning ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tHistory('rescanSong')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onMusicBrainzLookup}>
                    <MusicBrainzIcon className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tMusicBrainz('tooltip')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => setHistoryOpen(true)}>
                    <HistoryIcon className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tHistory('viewHistory')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 text-destructive hover:text-destructive'
                    disabled={isDeleting}
                    onClick={() => setDeleteOpen(true)}>
                    <TrashIcon className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tDelete('delete')}</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Mobile dropdown */}
        <div className='md:hidden'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='h-9 w-9'>
                <EllipsisVerticalIcon className='h-5 w-5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={onDownloadCover}>
                <ImageDownIcon />
                {tPreviewCard('downloadCover')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <EyeDashedIcon />
                {tDetailPanelSettings('tooltip')}
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={onEditCover}>
                    <ImageUpIcon />
                    {tPreviewCard('editCover')}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={isRescanning} onClick={() => rescanSong(song.id)}>
                    <RefreshCwIcon className={isRescanning ? 'animate-spin' : ''} />
                    {tHistory('rescanSong')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                    <HistoryIcon />
                    {tHistory('viewHistory')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className='text-destructive' onClick={() => setDeleteOpen(true)}>
                    <TrashIcon className='text-destructive' />
                    {tDelete('delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <HistoryModal open={historyOpen} onOpenChange={setHistoryOpen} songId={song.id} songTitle={displayTitle} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} section='detailPanel' />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tDelete('confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tDelete('confirmDesc', { name: displayTitle })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tDelete('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={handleDelete}>
              {tDelete('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
