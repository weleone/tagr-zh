import { Session } from 'next-auth'
import { getConfigValue } from '@/features/config/config.repository'
import { ConfigKey } from '@/features/config/domain'
import { getConfigQueryKey } from '@/features/config/hooks/use-config'
import { QueryClient } from '@tanstack/react-query'

const prefetchConfig = (queryClient: QueryClient, session: Session, key: ConfigKey, defaultData: unknown) =>
  queryClient.prefetchQuery({
    queryKey: getConfigQueryKey(key),
    queryFn: async () => {
      const configValue = await getConfigValue(session!.user.id, key)

      return configValue ? JSON.parse(configValue) : defaultData
    }
  })

export default prefetchConfig
