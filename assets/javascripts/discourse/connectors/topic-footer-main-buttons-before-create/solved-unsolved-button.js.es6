import { ajax } from 'discourse/lib/ajax';
import { popupAjaxError } from 'discourse/lib/ajax-error';

function solvedButton(component) {
  const {topic} = component.args;
  const button = topic.get("mmn_buttons.solved");
  console.log(`solved.can_click: ${button.can_click}`);
  if (!button.can_click) { return; }

  const solvedState   = topic.get("solved_state");
  const answerCount   = topic.get("accepted_answers") ? topic.get("accepted_answers").length : 0;
  const pressed       = button.pressed;

  console.log({solvedState, answerCount, pressed});

  let newState, buttonState, queueState;

  if (solvedState != "solved" && answerCount == 0 && pressed != "t") {
    // Current Topic state: unsolved
    // Number of solutions in the topic: 0
    // Current state of button: not pressed
    // New state of button: pressed
    // New state of topic: solved
    // AND: topic should be sent to the “Solved-queue”

    console.log("criteria 1");
    newState      = "solved";
    buttonState   = "t";
    queueState    = "t";
  } else if (solvedState == "solved" && answerCount == 0 && pressed == "t") {
    // SOLVED button
    // Current Topic state: Solved
    // Number of solutions in the topic: 0
    // Current state of button: pressed
    // New state of button: not pressed
    // New state of topic: Un-Solved
    // AND: topic should NOT be there in the “solved-queue”

    console.log("criteria 2");
    newState      = null;
    buttonState   = null;
    queueState    = null;
  } else if (solvedState == "solved" && answerCount > 0 && pressed != "t") {
    // SOLVED button
    // Current Topic state: Solved
    // Number of solutions in the topic: More than 0
    // Current state of button: not pressed
    // New state of button: pressed
    // New state of topic: Solved
    // AND: topic should NOT be there in the “solved-queue”

    console.log("criteria 3");
    newState      = "solved";
    buttonState   = "t";
    queueState    = null;
  } else if (solvedState == "solved" && answerCount > 0 && pressed == "t") {
    // SOLVED button
    // Current Topic state: Solved
    // Number of solutions in the topic: More than 0
    // Current state of button: pressed
    // New state of button: not pressed
    // New state of topic: Solved
    // AND: topic should NOT be there in the “solved-queue”

    console.log("criteria 4");
    newState      = "solved";
    buttonState   = null;
    queueState    = null;
  } else {
    // If doesn't meet any criteria
    console.log("solved: doesn't meet any criteria");
    return;
  }

  topic.set("solved_state", newState);
  topic.set("mmn_buttons.solved.pressed", buttonState);

  component.set("solvedClass", (buttonState == "t" ? "btn-success" : ""));

  ajax("/mmn_solved_queue/solved.json", {
    type: "POST",
    data: {
      id: topic.get("id"),
      solved_state: newState,
      mmn_button_solved_state: buttonState,
      mmn_solved_queue_state: queueState
    }
  }).catch(popupAjaxError);

}


function unsolvedButton(component) {
  const {topic} = component.args;
  const button = topic.get("mmn_buttons.unsolved");
  console.log(`unsolved.can_click: ${button.can_click}`);
  if (!button.can_click) { return; }

  const solvedState   = topic.get("solved_state");
  const pressed       = button.pressed;

  console.log({solvedState, pressed});

  let newState, buttonState, queueState;

  if (solvedState != "solved" && pressed != "t") {
    // UN-SOLVED button
    // Current Topic state: un-solved
    // Current state of button: not-pressed
    // New state of button: pressed
    // New state of topic: un-solved
    // AND: topic should be sent to the “Un-Solved-queue”

    console.log("criteria 1");
    newState      = null;
    buttonState   = "t";
    queueState    = "t";
  } else if (solvedState != "solved" && pressed == "t") {
    // UN-SOLVED button
    // Current Topic state: un-solved
    // Current state of button: pressed
    // New state of button: not-pressed
    // New state of topic: un-solved
    // AND: topic should NOT be there in “Un-Solved-queue”

    console.log("criteria 2");
    newState      = null;
    buttonState   = null;
    queueState    = null;
  } else if (solvedState == "solved" && pressed != "t") {
    // UN-SOLVED button
    // Current Topic state: solved
    // Current state of button: not-pressed
    // New state of button: pressed
    // New state of topic: un-solved
    // AND: topic should be sent to “Un-Solved-queue”

    console.log("criteria 3");
    newState      = null;
    buttonState   = "t";
    queueState    = "t";
  } else {
    // If doesn't meet any criteria
    console.log("unsolved: doesn't meet any criteria");
    return;
  }

  topic.set("solved_state", newState);
  topic.set("mmn_buttons.unsolved.pressed", buttonState);

  component.set("unsolvedClass", (buttonState == "t" ? "btn-danger" : ""));

  ajax("/mmn_solved_queue/unsolved.json", {
    type: "POST",
    data: {
      id: topic.get("id"),
      solved_state: newState,
      mmn_button_unsolved_state: buttonState,
      mmn_unsolved_queue_state: queueState
    }
  }).catch(popupAjaxError);

}

// function setState(component, state) {
//   const {topic} = component.args;
//   if (!topic.get("solved_can_queue")) { return; }
//   const currentState = topic.get("solved_state");
//   if ( currentState == state || currentState == String(state).replace("queue_", "")) {
//     // undo
//     state = null;
//   }
//   topic.set("solved_state", state);
//   setClasses(topic, component);
//   ajax("/mmn_solved_queue/set_state.json", {
//     type: "POST",
//     data: {
//       id: topic.get("id"),
//       state: state
//     }
//   }).catch(popupAjaxError);
// }

function setClasses(topic, component) {
  const buttons       = topic.get("mmn_buttons");
  const solvedClass   = buttons.solved.pressed == "t" ? "btn-success" : "";
  const unsolvedClass = buttons.unsolved.pressed == "t" ? "btn-danger" : "";
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
    btnSolved() {
      solvedButton(this);
    },
    btnUnsolved() {
      unsolvedButton(this);
    }
  }
};