export interface ITestimonial {
  id: string;
  customerName: string;
  message: string;
  rating: number;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestimonialFilters {
  isApproved?: boolean | string;
  rating?: number | string;
  page?: number | string;
  limit?: number | string;
  search?: string;
}
