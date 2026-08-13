import { mapProviderStatusToCanonical } from '../../status';
import { documentedNimbusPostStatusMap } from './schemas';

export function mapNimbusPostStatus(rawStatus: string | null | undefined) {
  return mapProviderStatusToCanonical(rawStatus, documentedNimbusPostStatusMap);
}
