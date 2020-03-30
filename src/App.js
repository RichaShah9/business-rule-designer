import React, { useEffect } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";

import customControlsModule from "./custom";
import qaExtension from "./resources/qa.json";
import Service from "./services/Service";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-font/dist/css/bpmn-embedded.css";
import "./App.css";

const HIGH_PRIORITY = 1500;
let bpmnModeler = null;

window.addEventListener("click", event => {
  const { target } = event;
  if (
    target === expressionPopupEl ||
    (expressionPopupEl && expressionPopupEl.contains(target))
  ) {
    return;
  }
  expressionPopupEl && expressionPopupEl.classList.add("hidden");
});

const expressionPopupEl = document.getElementById("expression-popup"),
  expressionInputEl = document.getElementById("expression-input"),
  okayEl = document.getElementById("okay"),
  formEl = document.getElementById("form");

const fetchId = () => {
  const regexReportPlanning = /[?&]id=([^&#]*)/g; // ?id=1
  const url = window.location.href;
  let matchBusinessRuleId, id;

  //while id is in URL
  while ((matchBusinessRuleId = regexReportPlanning.exec(url))) {
    id = matchBusinessRuleId[1];
    return id;
  }
};

const fetchDiagram = async (id, setBusinessRule) => {
  if (id) {
    let res = await Service.fetchId(
      "com.axelor.apps.orpea.planning.db.BusinessRule",
      id
    );
    let { diagramXml } = (res && res.data[0]) || {};
    setBusinessRule(res && res.data[0]);
    newBpmnDiagram(diagramXml);
  } else {
    newBpmnDiagram();
  }
};

const newBpmnDiagram = rec => {
  const diagram =
    rec ||
    `<?xml version="1.0" encoding="UTF-8"?>
  <definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
   xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
   xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
     xmlns:x="http://axelor.com" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
     <process id="Process_1" isExecutable="false"/>
     <bpmndi:BPMNDiagram id="BpmnDiagram_1">
     <bpmndi:BPMNPlane id="BpmnPlane_1" bpmnElement="Process_1"/>
     </bpmndi:BPMNDiagram>
  </definitions>`;

  openBpmnDiagram(diagram);
};

const openBpmnDiagram = xml => {
  bpmnModeler.importXML(xml, error => {
    if (error) {
      return console.log("fail import xml");
    }
    let canvas = bpmnModeler.get("canvas");
    const modeling = bpmnModeler.get("modeling");
    let businessObject, element, expression;
    function validate() {
      okayEl.disabled = false;
    }
    bpmnModeler.on("element.contextmenu", HIGH_PRIORITY, event => {
      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();
      expressionPopupEl && expressionPopupEl.classList.remove("hidden");
      ({ element } = event);
      if (!element.parent) {
        return;
      }
      businessObject = getBusinessObject(element);
      let { expression } = businessObject;
      expressionInputEl.value = expression ? expression : "";
      expressionInputEl.focus();
      validate();
    });

    formEl &&
      formEl.addEventListener("submit", event => {
        event.preventDefault();
        event.stopPropagation();
        expression = expressionInputEl.value;
        modeling.updateProperties(element, {
          expression
        });
        expressionPopupEl.classList.add("hidden");
      });

    formEl &&
      formEl.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          expressionPopupEl.classList.add("hidden");
        }
      });

    expressionInputEl &&
      expressionInputEl.addEventListener("input", validate);
    canvas.zoom("fit-viewport");
  });
};

function App() {
  const [businessRule, setBusinessRule] = React.useState({
    name: ""
  });

  const onSave = () => {
    bpmnModeler.saveXML({ format: true }, async function(err, xml) {
      let isValid = true;
      const obj = bpmnModeler._definitions.rootElements[0].flowElements;
      let array = Array.from(obj).filter(
        d => d.$type === "bpmn:ExclusiveGateway"
      );
      Object.values(array).forEach(r => {
        if (r.outgoing && r.outgoing.length > 2) {
          isValid = false;
          let x = document.getElementById("snackbar-alert");
          x.className = "show";
          setTimeout(function() {
            x.className = x.className.replace("show", "");
          }, 3000);
        }
      });
      let res =
        isValid &&
        (await Service.add("com.axelor.apps.orpea.planning.db.BusinessRule", {
          ...businessRule,
          diagramXml: xml
        }));
      if (res && res.data && res.data[0]) {
        setBusinessRule(res.data[0]);

        let x = document.getElementById("snackbar");
        x.className = "show";
        setTimeout(function() {
          x.className = x.className.replace("show", "");
        }, 3000);
      }
    });
  };
  useEffect(() => {
    bpmnModeler = new BpmnModeler({
      container: "#bpmnview",
      additionalModules: [customControlsModule],
      moddleExtensions: {
        qa: qaExtension
      }
    });
    let id = fetchId();
    fetchDiagram(id, setBusinessRule);
  }, [setBusinessRule]);

  return (
    <div id="bpmncontainer">
      <div
        style={{
          height: 50,
          background: "#2f4050",
          display: "flex",
          alignItems: "center"
        }}
      >
        <span style={{ color: "white", marginLeft: 10, fontWeight: "bold" }}>
          Business Rule Designer
        </span>
      </div>
      <div
        id="propview"
        style={{
          width: "100%",
          overflowX: "auto"
        }}
      ></div>
      <div
        id="bpmnview"
        style={{ width: "100%", height: "98vh", float: "left" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "left",
            padding: 20
          }}
        >
          <span
            style={{
              padding: 15
            }}
          >
            {businessRule && businessRule.name}
          </span>
          <button
            onClick={onSave}
            style={{
              width: 100,
              marginLeft: 10,
              padding: 10,
              borderRadius: 25,
              background: "rgba(0, 0, 0, 0.87)",
              color: "white"
            }}
          >
            Save
          </button>
        </div>
      </div>
      <div id="snackbar">Saved Successfully</div>
      <div id="snackbar-alert">
        Logic node has more than two connected nodes
      </div>
    </div>
  );
}

export default App;
