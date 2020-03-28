import { assign } from "min-dash";

export default function PaletteProvider(
  palette,
  create,
  elementFactory,
  spaceTool,
  lassoTool,
  translate
) {
  this._create = create;
  this._elementFactory = elementFactory;
  this._spaceTool = spaceTool;
  this._lassoTool = lassoTool;
  this.translate = translate;

  palette.registerProvider(this);
}

PaletteProvider.$inject = [
  "palette",
  "create",
  "elementFactory",
  "spaceTool",
  "lassoTool",
  "translate"
];

PaletteProvider.prototype.getPaletteEntries = function(element) {
  var actions = {},
    create = this._create,
    elementFactory = this._elementFactory,
    translate = this.translate;

  function createAction(type, group, className, title, options) {
    function createListener(event) {
      var shape = elementFactory.createShape(assign({ type: type }, options));

      if (options) {
        shape.businessObject.di.isExpanded = options.isExpanded;
      }

      create.start(event, shape);
    }

    var shortType = type.replace(/^bpmn:/, "");

    return {
      group: group,
      className: className,
      title: title || "Create " + translate(shortType),
      action: {
        dragstart: createListener,
        click: createListener
      }
    };
  }

  assign(actions, {
    "create.start-event": createAction(
      "bpmn:StartEvent",
      "event",
      "bpmn-icon-start-event-none"
    ),

    "create.exclusive-gateway": createAction(
      "bpmn:ExclusiveGateway",
      "gateway",
      "bpmn-icon-gateway-none"
    ),
    "create.task": createAction("bpmn:Task", "activity", "bpmn-icon-task"),
    "create.subprocess-expanded": createAction(
      "bpmn:SubProcess",
      "activity",
      "bpmn-icon-subprocess-expanded",
      "Create expanded SubProcess",
      { isExpanded: true }
    )
  });

  return actions;
};
