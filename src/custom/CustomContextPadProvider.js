import inherits from "inherits";

import ContextPadProvider from "bpmn-js/lib/features/context-pad/ContextPadProvider";

import { isAny } from "bpmn-js/lib/features/modeling/util/ModelingUtil";
import { is } from "bpmn-js/lib/util/ModelUtil";
import { assign } from "min-dash";

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

    function startConnect(event, element, autoActivate) {
      connect.start(event, element, autoActivate);
    }
    function removeElement(e) {
      modeling.removeElements([element]);
    }
    var actions = {};

    if (element.type === "label") {
      return actions;
    }
    function appendAction(type, className, title, options) {
      if (typeof title !== "string") {
        options = title;
        title = "Append " + type.replace(/^bpmn\:/, "");
      }

      function appendStart(event, element) {
        var shape = elementFactory.createShape(assign({ type: type }, options));
        create.start(event, shape, element);
      }

      var append = autoPlace
        ? function(event, element) {
            var shape = elementFactory.createShape(
              assign({ type: type }, options)
            );

            autoPlace.append(element, shape);
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
              translate("Append Gateway")
            )
          },
          {
            "append.subprocess-expanded": appendAction(
              "bpmn:SubProcess",
              "bpmn-icon-subprocess-expanded",
              translate("Append Sub process")
            )
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
