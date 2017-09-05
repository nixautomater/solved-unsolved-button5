import { ajax } from 'discourse/lib/ajax';

function genericError() {
  bootbox.alert(I18n.t('generic_error'));
}

export default Ember.Controller.extend({
  queryParams: ["state"],
  state: "queue_solved",
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
  setState(topic, state) {
    if (!topic.solved_can_process) {return;}

    let self = this;
    this.set("performingAction", true);
    ajax("/mmn_solved_queue/set_state.json", {
      type: "POST",
      data: {
        id: topic.id,
        state: state
      }
    }).then(() => {
      const model = self.get("model");
      self.set("model", model.filter(t => { return t.id != topic.id; }) );
    }).catch(genericError).finally(() => {
      self.set("performingAction", false);
    });
  },
  actions: {
    refresh() {
      this.findAll();
    },
    solved(topic) {
      this.setState(topic, "solved");
    },
    unsolved(topic) {
      this.setState(topic, "unsolved");
    },
    reject(topic) {
      this.setState(topic, null);
    }
  },
  actSolved: function() {
    return this.get("state") == "queue_solved" ? true : false;
  }.property("state"),

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