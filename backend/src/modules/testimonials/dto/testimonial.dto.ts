export interface CreateTestimonialDTO {
  customerName: string;
  message: string;
  rating: number;
}

export interface UpdateTestimonialDTO {
  customerName?: string;
  message?: string;
  rating?: number;
  isApproved?: boolean;
}
