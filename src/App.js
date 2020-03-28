import React from "react";
import "./App.css";
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-font/dist/css/bpmn-embedded.css";
import customControlsModule from "./custom";

import qaExtension from "./resources/qa.json";

import { getBusinessObject } from "bpmn-js/lib/util/ModelUtil";

import AxelorService from "./services/axelor.rest";

const serviceAPI = new AxelorService({
  model: "com.axelor.studio.db.Wkf"
});

const HIGH_PRIORITY = 1500;
window.addEventListener("click", event => {
  const { target } = event;

  if (target === qualityAssuranceEl || qualityAssuranceEl.contains(target)) {
    return;
  }

  qualityAssuranceEl.classList.add("hidden");
});

const qualityAssuranceEl = document.getElementById("quality-assurance"),
  suitabilityScoreEl = document.getElementById("suitability-score"),
  okayEl = document.getElementById("okay"),
  formEl = document.getElementById("form");
class App extends React.Component {
  bpmnModeler = null;
  constructor(props) {
    super(props);
    this.state = {
      diagram: null
    };
  }
  componentDidMount = () => {
    this.bpmnModeler = new BpmnModeler({
      container: "#bpmnview",
      additionalModules: [customControlsModule],
      moddleExtensions: {
        qa: qaExtension
      }
    });

    this.newBpmnDiagram();
  };

  newBpmnDiagram = rec => {
    const emptyBpmn = `<?xml version="1.0" encoding="UTF-8"?>
      <definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
      xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
       xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
       xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
        xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
         xmlns:x="http://axelor.com" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
       <process id="Process_1" name="undefined" isExecutable="false" x:id="undefined">
      <startEvent id="StartEvent_18mmhhg" name="" />
       </process>
      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
        <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
        <bpmndi:BPMNShape id="StartEvent_18mmhhg_di" bpmnElement="StartEvent_18mmhhg">
         <dc:Bounds x="149" y="108" width="36" height="36" />
           <bpmndi:BPMNLabel>   <dc:Bounds x="122" y="144" width="90" height="20" /> </bpmndi:BPMNLabel>
              </bpmndi:BPMNShape>
          </bpmndi:BPMNPlane>
         </bpmndi:BPMNDiagram>
      </definitions>`;

    this.openBpmnDiagram(emptyBpmn);
  };

  openBpmnDiagram = xml => {
    this.bpmnModeler.importXML(xml, error => {
      if (error) {
        return console.log("fail import xml");
      }

      var canvas = this.bpmnModeler.get("canvas");

      const moddle = this.bpmnModeler.get("moddle"),
        modeling = this.bpmnModeler.get("modeling");

      let analysisDetails, businessObject, element, suitabilityScore;

      function validate() {
        okayEl.disabled = false;
      }

      this.bpmnModeler.on("element.contextmenu", HIGH_PRIORITY, event => {
        event.originalEvent.preventDefault();
        event.originalEvent.stopPropagation();

        qualityAssuranceEl.classList.remove("hidden");

        ({ element } = event);

        if (!element.parent) {
          return;
        }

        businessObject = getBusinessObject(element);

        let { suitable } = businessObject;

        suitabilityScoreEl.value = suitable ? suitable : "";
        suitabilityScoreEl.focus();

        analysisDetails = getExtensionElement(
          businessObject,
          "qa:AnalysisDetails"
        );

        validate();
      });

      formEl.addEventListener("submit", event => {
        event.preventDefault();
        event.stopPropagation();
        suitabilityScore = suitabilityScoreEl.value;

        const extensionElements =
          businessObject.extensionElements ||
          moddle.create("bpmn:ExtensionElements");

        if (!analysisDetails) {
          analysisDetails = moddle.create("qa:AnalysisDetails");

          extensionElements.get("values").push(analysisDetails);
        }

        modeling.updateProperties(element, {
          extensionElements,
          suitable: suitabilityScore
        });

        qualityAssuranceEl.classList.add("hidden");
      });

      formEl.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          qualityAssuranceEl.classList.add("hidden");
        }
      });

      suitabilityScoreEl.addEventListener("input", validate);
      canvas.zoom("fit-viewport");
    });
  };

  onSave() {
    const obj = this.bpmnModeler._definitions.rootElements[0].flowElements;
    let array = Array.from(obj).filter(
      d => d.$type === "bpmn:ExclusiveGateway"
    );

    Object.values(array).forEach(r => {
      if (!r.outgoing || r.outgoing.length > 2) {
        alert("there are more than two connected nodes");
      }
    });

    this.bpmnModeler.saveXML({ format: true }, function(err, xml) {
      const data = {
        appBuilder: { id: 1 },
        displayTypeSelect: 0,
        isJson: true,
        isTrackFlow: false,
        jsonField: null,
        model: "ProductCategory",
        name: "new example",
        statusField: { id: 19 },
        bpmnXml: xml
      };

      const Actiondata = {
        action: "action-wkf-group-on-save",
        data: {
          context: {
            _model: "com.axelor.studio.db.Wkf",
            jsonField: null,
            description: null,
            statusField: { id: 16 },
            isJson: true,
            isTrackFlow: false,
            name: "new example",
            model: "ProductCategory",
            bpmnXml: xml,
            displayTypeSelect: 0,
            appBuilder: {
              id: 1
            },
            _id: null
          }
        }
      };
      serviceAPI.action(Actiondata).then(res => {
        if (res && res.data && res.data[0].reload) {
        }
      });

      serviceAPI.save(data).then(res => {
        if (res && res.data) {
          console.log(res.data);
        }
      });
    });
  }

  render() {
    return (
      <div id="bpmncontainer">
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
          <button
            onClick={() => this.onSave()}
            style={{ width: 50, marginLeft: 20, marginTop: 20 }}
          >
            save
          </button>
        </div>
      </div>
    );
  }
}

function getExtensionElement(element, type) {
  if (!element.extensionElements) {
    return;
  }

  return element.extensionElements.values.filter(extensionElement => {
    return extensionElement.$instanceOf(type);
  })[0];
}
export default App;
