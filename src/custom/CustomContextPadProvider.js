import inherits from "inherits";

import ContextPadProvider from "bpmn-js/lib/features/context-pad/ContextPadProvider";

import { isAny } from "bpmn-js/lib/features/modeling/util/ModelingUtil";
import { is } from "bpmn-js/lib/util/ModelUtil";
import { assign } from "min-dash";

import { translate as translateMessage } from "../utils";

export default function CustomContextPadProvider(
  config,
  injector,
  connect,
  create,
  translate
) {
  injector.invoke(ContextPadProvider, this);

  this.getContextPadEntries = function(element) {
    var modeling = this._modeling;
    var elementFactory = this._elementFactory;
    var autoPlace = this._autoPlace;
    var create = this._create;
    var translate = this._translate;
    var connect = this._connect;
    var businessObject = element.businessObject;

    function showAlert(isLogicNode) {
      let x = document.getElementById("snackbar-alert");
      x.className = "show";
      x.innerHTML = translateMessage(
        `${isLogicNode ? "Logic node" : "Node"} can have only ${
          isLogicNode ? "two" : "one"
        } outgoing node`
      );
      setTimeout(function() {
        x.className = x.className.replace("show", "");
      }, 3000);
    }

    function shouldConnectNode(element) {
      if (
        element.type !== "bpmn:ExclusiveGateway" &&
        element.outgoing.length > 0
      ) {
        showAlert(false);
        return false;
      }
      if (
        element.type === "bpmn:ExclusiveGateway" &&
        element.outgoing.length > 1
      ) {
        showAlert(true);
        return false;
      }
      return true;
    }

    function startConnect(event, element, autoActivate) {
      if (shouldConnectNode(element)) {
        connect.start(event, element, autoActivate);
      }
    }
    function removeElement(e) {
      modeling.removeElements([element]);
    }

    function createSubprocess(event) {
      var subProcess = elementFactory.createShape({
        type: "bpmn:SubProcess",
        x: 0,
        y: 0,
        isExpanded: true
      });

      var startEvent = elementFactory.createShape({
        type: "bpmn:StartEvent",
        x: 40,
        y: 82,
        parent: subProcess
      });

      create.start(event, [subProcess, startEvent], {
        hints: {
          autoSelect: [startEvent]
        }
      });
    }

    var actions = {};

    if (element.type === "label") {
      return actions;
    }
    function appendAction(type, className, title, options) {
      if (typeof title !== "string") {
        options = title;
        title = "Append " + type.replace(/^bpmn:/, "");
      }

      function appendStart(event, element) {
        if (shouldConnectNode(element)) {
          var shape = elementFactory.createShape(
            assign({ type: type }, options)
          );
          create.start(event, shape, {
            source: element
          });
        }
      }

      var append = autoPlace
        ? function(event, element) {
            if (shouldConnectNode(element)) {
              var shape = elementFactory.createShape(
                assign({ type: type }, options)
              );
              autoPlace.append(element, shape);
            }
          }
        : appendStart;

      return {
        group: "model",
        className: className,
        title: title,
        action: {
          dragstart: appendStart,
          click: append
        }
      };
    }
    if (isAny(businessObject, ["bpmn:FlowNode", "bpmn:InteractionNode"])) {
      assign(actions, {
        connect: {
          group: "connect",
          className: "bpmn-icon-connection-multi",
          title: translate("Connect using transition"),
          action: {
            click: startConnect,
            dragstart: startConnect
          }
        }
      });
    }
    if (is(businessObject, "bpmn:FlowNode")) {
      if (!is(businessObject, "bpmn:EndEvent")) {
        assign(
          actions,
          {
            "append.append-task": appendAction(
              "bpmn:Task",
              "bpmn-icon-task",
              "Append Task"
            )
          },
          {
            "append.gateway": appendAction(
              "bpmn:ExclusiveGateway",
              "bpmn-icon-gateway-none",
              "Append Gateway"
            )
          },
          {
            "append.subprocess-expanded": {
              group: "activity",
              className: "bpmn-icon-subprocess-expanded",
              title: "Append Sub Process",
              action: {
                dragstart: createSubprocess,
                click: createSubprocess
              }
            }
          }
        );
      }
    }

    assign(actions, {
      delete: {
        group: "edit",
        className: "bpmn-icon-trash",
        title: "Remove",
        action: {
          click: removeElement,
          dragstart: removeElement
        }
      },
      edit: {
        group: "edit",
        className: "fa-pencil",
        title: "Edit",
        action: {
          click: this.onElementEdit
        }
      }
    });
    return actions;
  };
}

inherits(CustomContextPadProvider, ContextPadProvider);

CustomContextPadProvider.$inject = [
  "config.contextPad",
  "injector",
  "eventBus",
  "contextPad",
  "modeling",
  "elementFactory",
  "connect",
  "create",
  "popupMenu",
  "canvas",
  "rules",
  "translate"
];
