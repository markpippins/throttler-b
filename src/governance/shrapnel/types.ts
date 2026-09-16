/**
 * Shrapnel Type & Interaction IR for Throttler
 * Defines reusable, versioned shapes that cross governance boundaries.
 */

export interface ActorContext {
  id: string;
  role: string;
}

export interface SubjectReference {
  id: string;
  concept: string; // e.g. 'File', 'Folder'
}

export interface InteractionContext {
  pane_id: number;
  profile_id?: string;
  source_path: string[];
  selection?: string[];
}

export interface BaseInteractionEnvelope<TType extends string, TPayload> {
  interaction_id: string;
  interaction_type: TType;
  interaction_type_revision: string;
  actor: ActorContext;
  subject: SubjectReference;
  context: InteractionContext;
  payload: TPayload;
  correlation_id: string;
  causation_id?: string;
  client_read_set_digest?: string;
  timestamp: string;
}

export interface RenameItemPayload {
  old_name: string;
  new_name: string;
}

export type RenameItemInteraction = BaseInteractionEnvelope<'RenameItem', RenameItemPayload>;

export const SHRAPNEL_REVISIONS = {
  RenameItem: 'shrapnel:type:rename-item:1.0.0',
  Navigate: 'shrapnel:type:navigate:1.0.0',
  MountProfile: 'shrapnel:type:mount-profile:1.0.0',
} as const;
