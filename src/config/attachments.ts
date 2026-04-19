import type { AttachmentDefinition } from '../domain/models/types';

export const ATTACHMENTS: AttachmentDefinition[] = [
  {
    attachmentId: 'switch',
    displayName: 'Switch',
    price: 50_000,
    category: 'attachments',
    damageBonus: 2,
    accuracyBonus: 0,
    description: '+2 Damage',
  },
  {
    attachmentId: 'laser_beam',
    displayName: 'Laser Beam',
    price: 25_000,
    category: 'attachments',
    damageBonus: 0,
    accuracyBonus: 3,
    description: '+3 Accuracy',
  },
];

export const ATTACHMENT_BY_ID = Object.fromEntries(
  ATTACHMENTS.map((attachment) => [attachment.attachmentId, attachment]),
) as Record<AttachmentDefinition['attachmentId'], AttachmentDefinition>;
