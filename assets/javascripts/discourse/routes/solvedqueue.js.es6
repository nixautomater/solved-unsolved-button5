import { ajax } from 'discourse/lib/ajax';

export default Discourse.Route.extend({
  queryParams: {
    state: {refreshModel: true}
  },
  model(params) {
    return ajax("/mmn_solved_queue/list.json", {
      data: {
        state: params.state
      }
    }).then(result => {
      return result;
    });
  },
  setupController(controller, model) {
    controller.setProperties({
      model: model
    });
  }
});