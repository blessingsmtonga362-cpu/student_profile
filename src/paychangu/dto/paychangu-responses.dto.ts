export interface InitializePaymentResponse {
  payment_url: string;
  transaction_id: string;
  reference: string;
}

export interface VerifyPaymentResponse {
  transaction_id: string;
  reference?: string;
  status: 'success' | 'failed' | 'pending' | string;
  amount?: number;
  currency?: string;
  metadata?: PaychanguPaymentMetadata;
  raw?: unknown;
}

export interface PaychanguPaymentMetadata {
  student_ids: string[];
  batch_size: number;
  payment_type: 'student_batch_payment';
}

export interface WebhookPayload {
  event?: string;
  type?: string;
  data?: {
    transaction_id?: string;
    tx_ref?: string;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: PaychanguPaymentMetadata;
  };
  transaction_id?: string;
  tx_ref?: string;
  reference?: string;
  status?: string;
  amount?: number;
  currency?: string;
  metadata?: PaychanguPaymentMetadata;
}

export interface PaychanguInitializeApiResponse {
  status?: string;
  message?: string;
  data?: {
    checkout_url?: string;
    payment_url?: string;
    transaction_id?: string;
    reference?: string;
    tx_ref?: string;
  };
}

export interface PaychanguVerifyApiResponse {
  status?: string;
  message?: string;
  data?: {
    transaction_id?: string;
    reference?: string;
    tx_ref?: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: PaychanguPaymentMetadata;
  };
}
