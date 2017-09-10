import { withPluginApi } from 'discourse/lib/plugin-api';
import { ajax } from 'discourse/lib/ajax';
import TopicStatus from 'discourse/raw-views/topic-status';

export default {
  name: 'mmn_solved_unsolved_button',
  initialize(c) {
    const ss = c.lookup('site-settings:main');
    if (!ss.solved_enabled) { return; }

    TopicStatus.reopen({
      statuses: function(){
        const results = this._super();
        if (this.topic.solved_state == "solved") {
          results.push({
            openTag: 'span',
            closeTag: 'span',
            title: I18n.t('solved.has_accepted_answers'),
            icon: 'check-square-o'
          });
        } else if(this.topic.can_have_answer && this.siteSettings.solved_enabled && this.siteSettings.empty_box_on_unsolved){
          results.push({
            openTag: 'span',
            closeTag: 'span',
            title: I18n.t('solved.has_no_accepted_answers'),
            icon: 'square-o'
          });
        }
        return results;
      }.property()
    });

    withPluginApi('0.1', api => {

      const currentUser = api.getCurrentUser();

      if (currentUser) {
        ajax("/mmn_solved_queue/is_show_link").then(result => {
          ["solved", "unsolved"].filter(menu => {
            return result[menu];
          }).forEach(state => {
            api.decorateWidget('hamburger-menu:generalLinks', () => {
              return {
                href: `/solvedqueue?state=${state}`,
                label: `mmn_solved_queue.menu.${state}`
              };
            });
          });
        });
      }
    });
  }
}