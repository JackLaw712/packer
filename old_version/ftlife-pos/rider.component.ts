import { Component, } from '@angular/core';
import { NavController, NavParams, ViewController, AlertController } from 'ionic-angular';
import { QuoteService } from '../../../../providers/quotation/quote.service';
import { Utils } from '../../../../providers/utils/utils';
import { ProductService } from '../../../../service/product-list/product.service';
import { Rider } from '../model/rider';
import { SessionStorage } from '../../../../providers/utils/session';
import { Alert } from 'ionic-angular/components/alert/alert';
import { StorageService } from '../../../../providers/new-service/storage-service';
import { Constants } from '../../../../../src/providers/utils/constants';
import { DbService } from '../../../../providers/new-service/db.service';
import { TranslateService } from '@ngx-translate/core';
import { AgentAcks } from '../../../../model/agent';
import { AgentProvider } from '../../../../providers/service/agent.service';
import { HttpService } from '../../../../providers/new-service/http/http-service';
import { AppConfigService } from '../../../../providers/service/app-config.service';
import { AppService } from '../../../../providers/new-service/app/app-service';
import * as moment from 'moment';

declare function getRequestHeaders():any;
@Component({
  selector: 'page-rider',
  templateUrl: 'rider.component.html',
})

export class RiderComponent {
  title: String = "Application";
  rider: string[];
  private planList: any[] = [];
  filteredRiders: any = [];
  searchFilter: string;
  isEmpty: boolean = true;
  unlockCodeOfConductRequest: boolean = true;
  profile: any;
  currentInsured: any;
  selectableRiders: any[] = [];
  rates: any;
  translation: any = {};
  agent;
  appType;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewController: ViewController,
    private quoteService: QuoteService,
    public utils: Utils,
    public productService: ProductService,
    public session: SessionStorage,
    private alertCtrl: AlertController,
    private storageService: StorageService,
    private dbService: DbService,
    private translateService: TranslateService,
    private httpService: HttpService,
    public agentProvider: AgentProvider,
    public appSvc: AppConfigService,
    private appService: AppService,
  ) {
    this.translation = this.session.getTranslationObject();

    navParams.get('profile').value.forEach(element => {
      this.profile = element;
    });
  }

  private totalComplexRiders = 0;

  ngOnInit() {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.getNavParams();
    this.sortRiders();
    this.filteredRiders = this.selectableRiders;
    this.searchFilter = '';
  }

  sortRiders() {
    this.selectableRiders.sort((a, b) => {
      let planCodeA = a.planCode.value;
      let planCodeB = b.planCode.value;
      if (planCodeA < planCodeB) {
        return -1;
      }
      if (planCodeA > planCodeB) {
        return 1;
      }
      return 0;
    });
  }

  getNavParams() {
    this.planList = this.navParams.get('planList');
    this.selectableRiders = this.navParams.get('selectableRiders');
    this.currentInsured = this.navParams.get('currentInsured');
    this.rates = this.navParams.get('rates');
  }

  ionViewDidLoad() {
  }

  closeChecklist() {
    this.selectableRiders.forEach(rider => {
      rider.selected = false;
    });
    this.closeModal(this.selectableRiders);
  }
  
  private async addRiders() {
    let validate = await this.validate();
    if (validate.valid) {
      let interestedRiders = this.selectableRiders.filter(rider => {
        return rider.selected;
      });
      let notAckedRiders = [];
      let flag: boolean;

      const docId = this.appSvc.getDocumentIdByType(Constants.PRODUCT_COMPLEX);
      const productComplexDoc = await this.dbService.getDocument('config_db', docId);
      let isComplex = false;
      let isBlocked = false;
      let online = this.utils.isNetworkConnected();
      let url = Constants.AGENT_TRAINING;
      this.appType = await this.appService.getAppType();
      this.agent = await this.agentProvider.getCurrentAgent();
      let agentCode = (this.agent.type == "agent") ? this.agent.agentId : this.agent.companyCode;

      // Count how many complex riders
      interestedRiders.forEach(async rider => {
        let planCode = rider.planCode.value;
        productComplexDoc.queries.forEach((item) => {
          if (item.planCode == planCode) {
            isComplex = true;
            if(this.unlockCodeOfConductRequest){
            this.totalComplexRiders++;
            }
            if(isBlocked==false){
              isBlocked= true;
            }
          }
        })
      });
      interestedRiders.forEach(async rider => {
        let planCode = rider.planCode.value;
        productComplexDoc.queries.forEach((item) => {
          if (item.planCode == planCode) {
            isComplex = true;
            if(isBlocked==false){
              isBlocked= true;
            }
          }
        })
        if(isComplex){
          if (online && this.unlockCodeOfConductRequest) {
            this.unlockCodeOfConductRequest = false;
            let popAlert = false;
            productComplexDoc.queries.forEach((item) => {
              if (item.planCode == planCode) {
                popAlert = true;
              }
            })
            let reqHeaders = getRequestHeaders();
            let headers = {
              Accept: 'application/json',
              "Content-Type": 'application/json'
            };
            Object.assign(headers, reqHeaders);
            console.log('Sending request to: ', url, this.agent, rider.planCode.value);
            const datameta = {
                "head": {
                  "send_sysname": "POS",
                  "recv_sysname": "P06"
                },
                "body": {
                  "agentCode": agentCode,
                  "plancode": planCode
                }
            }
            const resp = await this.httpService.httpRequest({
                url,
                method: 'post',
                data: datameta,
                headers: headers
              });
            console.log(resp, "resp");
            if(resp && popAlert){
              if (resp.head.rtn_code == "SUC001") {
                if (resp.body.status == "Y") {
                  this.codeOfConductAlert(notAckedRiders);
                }else {
                  notAckedRiders.push(rider);
                  this.codeOfConductAlert(notAckedRiders);                
                }
              } else {
                if (resp.head.rtn_code == "ERR001") {
                  let msg = this.translateService.instant('ALERT_MSG.ERR001');
                  this.alertError(msg);
                } else if (resp.head.rtn_code == "ERR002") {
                  let msg = this.translateService.instant('ALERT_MSG.ERR002');
                  this.alertError(msg);
                } else if (resp.head.rtn_code == "ERR003") {
                  notAckedRiders.push(rider);
                  this.codeOfConductAlert(notAckedRiders);             
                }
              }
              if (resp.body.status) {
                this.getquetoDoc(agentCode, planCode, resp.body.status);
              }
            }
      
            console.log("Save security passcode in server successfully: " + resp);
            console.log("-------------------- -------------------------------------");
          } else {
                notAckedRiders.push(rider);
                this.codeOfConductAlert(notAckedRiders);
          }
        }else{
          this.codeOfConductAlert(notAckedRiders);
        }
      });
    } else {
      this.alertErrors(validate.errorMsgs);
    }
  }

  codeOfConductAlert(notAckedRiders) {
    if (notAckedRiders.length > 0) {
      if (notAckedRiders.length == this.totalComplexRiders){     
        let dialog = this.createAckDialog(notAckedRiders);
        dialog.onDidDismiss(async (data) => {
          if (data && data.acked === true) {
            let ackedProds = notAckedRiders.map(rider => {
              return {
                date: new Date,
                productCode: rider.productCode,
                planCode: rider.planCode.possible
              }
            })
          }
        });
        dialog.present();
        this.totalComplexRiders = 0;
        this.unlockCodeOfConductRequest = true
      } 
      }
      else {
        this.closeModal(this.selectableRiders);
      }
  }

  alertError(errorMessage, onDismissCallback = () => { }, enableBackdropDismiss = true) {
    let title = this.translateService.instant('ALERT_TITLE.Error');
    let ok = this.translateService.instant('BUTTONS.OK');
    let alert = this.alertCtrl.create({
      title,
      subTitle: errorMessage,
      buttons: [{
        text: ok,
        handler() {
          alert.dismiss().then(onDismissCallback);
          // return false;
        }
      }],
      enableBackdropDismiss
    });
    alert.present();
  }

  async getquetoDoc(agentcode, plancode, status) {
    let agent = await this.storageService.getAgent();
    let { agentId, channel, company, companyChannel } = agent;
    let docId = `${Constants.DOC_TYPE_QUETO}_${agentId}`;
    let AgentQueto = await this.dbService.getDocument('agent_db', docId).catch(err => console.error(err));
    let time = moment((new Date()).getTime()).format('YYYY/MM/DD hh:mm:ss');
    let showupdate = true;
    if (AgentQueto) {
      if (AgentQueto.ackedProducts.length > 0) {
        const length = AgentQueto.ackedProducts.length;
        for (let i = length - 1; i >= 0; i--) {
          // no need to store click record again if
          // [1] agent quoted this product before, and
          // [2] agent had passed exam that time
          if (
            AgentQueto.ackedProducts[i].plancode === plancode // [1]
            && AgentQueto.ackedProducts[i].status === 'Y' // [2]
          ) {
            showupdate = false;
            break;
          }
        }
      }
      AgentQueto = {
        _id: docId,
        channel,
        company,
        companyChannel,
        agentId,
        ackedProducts: [...AgentQueto.ackedProducts, {
          plancode: plancode,
          agentcode: agentcode,
          status: status,
          time: time
        }],
        type: 'quote'
      }
    } else {
      AgentQueto = {
        _id: docId,
        channel,
        company,
        companyChannel,
        agentId,
        ackedProducts: [],
        type: 'quote'
      }
    }
    if (showupdate) {
      await this.dbService.upsertDocument("agent_db", AgentQueto, docId);
    }
    console.log(AgentQueto, 234324)
    return AgentQueto;
  }

  async getAckStatusDoc(): Promise<AgentAcks> {
    this.agent = await this.agentProvider.getCurrentAgent();
    let { agentId, channel, company, companyChannel } = this.agent;
    let docId = `${Constants.DOC_TYPE_AGENT_ACKS}_${agentId}`;
    let ackDoc: AgentAcks = await this.dbService.getDocument('agent_db', docId).catch(err => console.error(err));
    if (!ackDoc) {
      ackDoc = {
        _id: docId,
        channel,
        company,
        companyChannel,
        agentId,
        ackedProducts: [],
        type: 'agent_ack'
      }
    }
    return ackDoc;
  }

  createAckDialog(riders: any[]) {
    let useNewMessage = false;
    let ridersName = "";
    for(let i = 0; i < riders.length; i++){
      let status = this.productService.quotabilityService.productRules.productRules[riders[i].productCode];
      if(status.useNewMsg && status.useNewMsg == true){
        useNewMessage = true;
      }  
      if (i == 0){
        ridersName += this.setLanguage(riders[i].planName);
      }
      else if (i != riders.length - 1){
        ridersName += ', '+ this.setLanguage(riders[i].planName);
      }
      else{         
        ridersName += this.translateService.instant('ALERT_MSG.CONJUNCTION_WORD') + this.setLanguage(riders[i].planName);
      }
      
    }
    let msg = "";
    if(this.appType =='agent'){ 
      if(useNewMessage){
        msg = this.translateService.instant('ALERT_MSG.IS_TRAINING_SUCCESS_C_F') + this.setLanguage(ridersName) + this.translateService.instant('ALERT_MSG.IS_TRAINING_SUCCESS_C_B');
      }else{
        msg = this.translateService.instant('ALERT_MSG.IS_TRAINING_SUCCESS_A_F') + this.setLanguage(ridersName) + this.translateService.instant('ALERT_MSG.IS_TRAINING_SUCCESS_A_B');
      } 
    } else if (this.appType =='ca'){
      msg = this.translateService.instant('ALERT_MSG.IS_TRAINING_SUCCESS_B_F') + this.setLanguage(ridersName) + this.translateService.instant('ALERT_MSG.IS_TRAINING_SUCCESS_B_B');
    }
    let message = '<ul>' + '<li>' + msg + '</li>' + '</ul>';

    let title = this.translateService.instant('ALERT_TITLE.Reminder');
    let dialog = this.alertCtrl.create({
      title,
      message,
      buttons: [
        {
          text: 'OK',
          handler: () => {
            dialog.dismiss({ acked: true });
            message = "";
            return false;
          }
        }
      ]
    });
    return dialog;
  }

  async validate() {
    let errorMsgs = [];
    let selectedSr = this.selectableRiders.filter(sr => { return sr.selected });
    let tempPlanList = this.planList.concat(selectedSr);
    for (let i = 0; i < tempPlanList.length; i++) {
      let plan = tempPlanList[i];
      const coexistConfig = (plan.planType == 'Rider') ? plan.coexistence_rider || plan.coexistence : plan.coexistence;
      if(coexistConfig){
        if(coexistConfig.length==1){
          if (coexistConfig[0] && coexistConfig[0].products) {
            let validArr = [];
            let isCountryResidenceForChecking = true;
            if (coexistConfig[0].profileChecking && coexistConfig[0].profileChecking.countryResidence) {
              isCountryResidenceForChecking = await this.productService.checkCountryResidence(this.currentInsured, coexistConfig[0]);
            }
            coexistConfig[0].products.forEach(cepCode => {
              let planListIndex = tempPlanList.findIndex(p => { return p.productCode == cepCode });
              const isValid = isCountryResidenceForChecking ? planListIndex > -1 : true;
              validArr.push(isValid);
            });
            let msg = this.setLanguage(coexistConfig[0].errorMessage);
            if (validArr.some(v => { return !v }) && errorMsgs.indexOf(msg) < 0) {
              errorMsgs.push(msg);
            }
          }
        }else if(coexistConfig.length>1){
          const findRelatedConfig = coexistConfig.find(obj => {
            if(obj.preExist && this.planList.find( p => { return p.productCode == obj.preExist})){
              return obj;
            }
          })
          
            if (findRelatedConfig && findRelatedConfig.products) {
              let validArr = [];
              let isCountryResidenceForChecking = true;
              if (findRelatedConfig.profileChecking && findRelatedConfig.profileChecking.countryResidence) {
                isCountryResidenceForChecking = await this.productService.checkCountryResidence(this.currentInsured, findRelatedConfig);
              }
              findRelatedConfig.products.forEach(cepCode => {
                let planListIndex = tempPlanList.findIndex(p => { return p.productCode == cepCode });
                const isValid = isCountryResidenceForChecking ? planListIndex > -1 : true;
                validArr.push(isValid);
              });
              let msg = this.setLanguage(findRelatedConfig.errorMessage);
              if (validArr.some(v => { return !v }) && errorMsgs.indexOf(msg) < 0) {
                errorMsgs.push(msg);
              }
            }
          
        }
      }
      if (this.planList[0].dateback.value == 'yes') {
        if (plan.dateback && plan.dateback.defaultDisallowed) {
          errorMsgs.push(this.translation.PLAN_NOT_AVAILABLE_WITH_DATEBACK.DATEBACK_NOT_ALLOWED_FOR_PLAN.replace(/%invalidPlanName/g, this.utils.translate(plan.planName)));
        }
      }
      for (let j = 0; j < selectedSr.length; j++) {
        let sr = selectedSr[j];
        if (plan.dateback && plan.dateback.value && plan.dateback.value == 'yes') {
          let validate = this.quoteService.isEligibilityWithDatebackValid(sr, this.currentInsured, this.translation);
          if (!validate.valid) {
            errorMsgs.push(validate.errorMessage);
          }
        }
        if (plan.attachRiderValidation) {
          let validate = eval(plan.attachRiderValidation.validateFunc)(sr.productCode, plan, this.rates[plan._id], tempPlanList, this.currentInsured.applicantInfo);
          if (!validate.valid) {
            errorMsgs.push(this.setLanguage(validate.errorMessage));
          }
        }
      }
    }
    return {
      valid: (errorMsgs.length == 0),
      errorMsgs: errorMsgs
    };
  }

  showRider(rider) {
    if (typeof rider.buyable == 'undefined') {
      return true;
    } else {
      return rider.buyable;
    }
  }

  alertErrors(errorMessages) {
    let message = '';
    errorMessages.forEach((msg, index, arr) => {
      message += (index == 0) ? '<ul>' : '';
      message += '<li>' + msg + '</li>';
      message += (index < arr.length - 1) ? '' : '</ul>';
    });
    let alert = this.alertCtrl.create({
      title: this.translation.ALERT_TITLE.Error,
      subTitle: message,
      buttons: [this.translation.BUTTONS.OK]
    });
    alert.present();
  }

  closeModal(riderList: any) {
    this.viewController.dismiss(riderList);
  }

  public setLanguage(textObject) {
    return this.utils.setLanguageSettings(textObject);
  }

  setChecked(rider) {
    if (rider.selected == undefined) {
      rider.selected = true;
    } else {
      rider.selected = !rider.selected;
    }

  }

  public filterRiders(value) {
    this.filteredRiders = [];
    if ('' == value || undefined == value || null == value) {
      this.isEmpty = true;
    }
    else {
      this.isEmpty = false;

      this.selectableRiders.forEach(element => {
        let planCode = (element.planCode.value).toLowerCase();
        let planName = this.setLanguage(element.planName).toLowerCase();
        if (planCode.indexOf(this.searchFilter.toLowerCase()) != -1 || planName.indexOf(this.searchFilter.toLowerCase()) != -1) {
          this.filteredRiders.push(element);
        }
      });

    }
  }

  showCheckbox(rider) {
    let anti = 0;
    const coexistConfig = rider.coexistence_rider || rider.coexistence;
    let findRelatedConfig;
    if(coexistConfig){
      findRelatedConfig = coexistConfig.find(obj =>{
        if('anti' in obj||'antiRider' in obj){
          return obj;
        }
      })
      if (findRelatedConfig && findRelatedConfig.anti) {
        findRelatedConfig.anti.forEach(ar => {
          let i = this.selectableRiders.findIndex(sr => { return sr.productCode == ar && sr.selected });
          let j = this.planList.findIndex(p => { return p.productCode == ar });
          if (i > -1 || j > -1) {
            anti++;
          }
        });
      }

      if (findRelatedConfig && findRelatedConfig.antiRider) {
        findRelatedConfig.antiRider.forEach(ar => {
          let i = this.selectableRiders.findIndex(sr => { return sr.productCode == ar && sr.selected });
          let j = this.planList.findIndex(p => { return p.productCode == ar && p.planType == 'Rider' });
          if (i > -1 || j > -1) {
            anti++;
          }
        });
      }
    }
    if (anti > 0) {
      rider.selected = false;
      return false;
    } else {
      return true;
    }    
  }
}

function getValidRateSet(rates, key) {
  return Utils.getValidRateSet(rates, key);
}