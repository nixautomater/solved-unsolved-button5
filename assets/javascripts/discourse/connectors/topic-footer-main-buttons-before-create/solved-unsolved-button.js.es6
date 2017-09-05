import { ajax } from 'discourse/lib/ajax';
import { popupAjaxError } from 'discourse/lib/ajax-error';

function setState(component, state) {
  const {topic} = component.args;
  if (!topic.get("solved_can_queue")) { return; }
  const currentState = topic.get("solved_state");
  if ( currentState == state || currentState == String(state).replace("queue_", "")) {
    // undo
    state = null;
  }
  topic.set("solved_state", state);
  setClasses(topic, component);
  ajax("/mmn_solved_queue/set_state.json", {
    type: "POST",
    data: {
      id: topic.get("id"),
      state: state
    }
  }).catch(popupAjaxError);
}

function setClasses(topic, component) {
  const state         = topic.get("solved_state");
  const solvedClass   = (state == "queue_solved" || state == "solved") ? "btn-success" : "";
  const unsolvedClass = (state == "queue_unsolved" || state == "unsolved") ? "btn-danger" : "";
  component.set("solvedClass", solvedClass);
  component.set("unsolvedClass", unsolvedClass);
}

export default {
  shouldRender({topic}, component) {
    return topic.solved_show_button;
  },
  setupComponent({topic}, component) {
    setClasses(topic, component);
  },
  actions: {
    queueSolved() {
      setState(this, "queue_solved");
    },
    queueUnsolved() {
      setState(this, "queue_unsolved");
    }
  }
};