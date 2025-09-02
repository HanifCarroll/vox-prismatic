import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface UrlState {
  view?: 'cards' | 'list' | 'kanban';
  stage?: string[];
  platform?: string[];
  tags?: string[];
  search?: string;
  sort?: string;
  sortDir?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UrlStateService {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  getUrlState(): Observable<UrlState> {
    return this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.parseUrlParams())
    );
  }

  getCurrentUrlState(): UrlState {
    return this.parseUrlParams();
  }

  updateUrlState(state: Partial<UrlState>, replaceUrl = true): void {
    const currentParams = this.parseUrlParams();
    const newParams = { ...currentParams, ...state };
    
    const queryParams: any = {};
    
    if (newParams.view && newParams.view !== 'cards') {
      queryParams.view = newParams.view;
    }
    
    if (newParams.stage && newParams.stage.length > 0) {
      queryParams.stage = newParams.stage.join(',');
    }
    
    if (newParams.platform && newParams.platform.length > 0) {
      queryParams.platform = newParams.platform.join(',');
    }
    
    if (newParams.tags && newParams.tags.length > 0) {
      queryParams.tags = newParams.tags.join(',');
    }
    
    if (newParams.search) {
      queryParams.search = newParams.search;
    }
    
    if (newParams.sort) {
      queryParams.sort = newParams.sort;
    }
    
    if (newParams.sortDir && newParams.sortDir !== 'asc') {
      queryParams.sortDir = newParams.sortDir;
    }
    
    if (newParams.dateFrom) {
      queryParams.dateFrom = newParams.dateFrom;
    }
    
    if (newParams.dateTo) {
      queryParams.dateTo = newParams.dateTo;
    }

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams,
      queryParamsHandling: 'replace',
      replaceUrl
    });
  }

  clearFilters(): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {},
      queryParamsHandling: 'replace'
    });
  }

  private parseUrlParams(): UrlState {
    const params = new URLSearchParams(window.location.search);
    const state: UrlState = {};

    const view = params.get('view');
    if (view === 'cards' || view === 'list' || view === 'kanban') {
      state.view = view;
    }

    const stage = params.get('stage');
    if (stage) {
      state.stage = stage.split(',').filter(s => s.length > 0);
    }

    const platform = params.get('platform');
    if (platform) {
      state.platform = platform.split(',').filter(p => p.length > 0);
    }

    const tags = params.get('tags');
    if (tags) {
      state.tags = tags.split(',').filter(t => t.length > 0);
    }

    const search = params.get('search');
    if (search) {
      state.search = search;
    }

    const sort = params.get('sort');
    if (sort) {
      state.sort = sort;
    }

    const sortDir = params.get('sortDir');
    if (sortDir === 'asc' || sortDir === 'desc') {
      state.sortDir = sortDir;
    }

    const dateFrom = params.get('dateFrom');
    if (dateFrom) {
      state.dateFrom = dateFrom;
    }

    const dateTo = params.get('dateTo');
    if (dateTo) {
      state.dateTo = dateTo;
    }

    return state;
  }

  buildShareableUrl(): string {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }
}