import { withPluginApi } from 'discourse/lib/plugin-api';
import { ajax } from 'discourse/lib/ajax';

export default {
  name: 'mmn_solved_unsolved_button',
  initialize(c) {
    const ss = c.lookup('site-settings:main');
    if (!ss.solved_enabled) { return; }

    withPluginApi('0.1', api => {
      const currentUser = api.getCurrentUser();

      if (currentUser) {
        ajax("/mmn_solved_queue/is_show_link").then(result => {
          if (result.show_link) {
            ["solved", "unsolved"].forEach(state => {
              api.decorateWidget('hamburger-menu:generalLinks', () => {
                return {
                  href: `/solvedqueue?state=queue_${state}`,
                  label: `mmn_solved_queue.menu.${state}`
                };
              });
            });
          }
        });
      }
    });
  }
}