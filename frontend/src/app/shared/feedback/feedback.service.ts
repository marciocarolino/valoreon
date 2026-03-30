import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type FeedbackType = 'BUG' | 'SUGGESTION' | 'FEEDBACK';

export interface FeedbackRequest {
  type: FeedbackType;
  message: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/feedback`;

  send(data: FeedbackRequest): Observable<void> {
    return this.http.post<void>(this.baseUrl, data);
  }
}
