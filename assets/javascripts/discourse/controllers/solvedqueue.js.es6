import { ajax } from 'discourse/lib/ajax';

function genericError() {
  bootbox.alert(I18n.t('generic_error'));
}

export default Ember.Controller.extend({
  queryParams: ["state"],
  state: "solved",
  performingAction: false,

  findAll() {
    let self = this;
    this.set("performingAction", true);
    ajax("/mmn_solved_queue/list.json", {
      data: {
        state: self.get("state")
      }
    }).then(result => {
      self.set("model", result);
    }).catch(genericError).finally(() => {
      self.set("performingAction", false);
    });
  },

  actions: {
    refresh() {
      this.findAll();
    }
  },

  cookedTopics: function() {
    return this.get("model").map(topic => {
      const user = topic.user;
      return {
        id: topic.id,
        user: {
          created_at: topic.bumped_at,
          user_id: user.id,
          username: user.username,
          avatar_template: user.avatar_template,
          name: user.name,
          id: user.id,
          usernameUrl: `/u/${user.username}`
        },
        shareUrl: `/t/${topic.slug}/${topic.id}`,
        post_number: 1,
        title: topic.title,
        solved_can_process: topic.solved_can_process
      };
    });
  }.property("model")

});