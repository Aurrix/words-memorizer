import { routes } from './app.routing';

describe('routes', () => {
  it('defines the main application screens as lazy routes', () => {
    expect(routes.map((route) => route.path)).toEqual([
      '',
      'cards',
      'history',
      'settings'
    ]);
    expect(routes.every((route) => typeof route.loadComponent === 'function')).toBeTrue();
  });
});
