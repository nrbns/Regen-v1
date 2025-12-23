export type RegenMessage = {
  type: string;
  payload?: unknown;
};

export type RegenResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export function handleMessage(_msg: RegenMessage): RegenResponse {
  return { success: true, data: { status: 'stub' } };
}
