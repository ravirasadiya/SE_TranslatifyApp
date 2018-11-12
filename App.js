import React, { Component } from 'react';
import { StatusBar, Text, View, TouchableOpacity, Dimensions, StyleSheet, Image, Alert, ActivityIndicator, TextInput, Picker } from 'react-native';

import { RNCamera } from 'react-native-camera';
import Spinner from 'react-native-loading-spinner-overlay';
import Modal from 'react-native-simple-modal';
import RNExitApp from 'react-native-exit-app';
import axios from 'axios';

const API_KEY = '';
const visionApi = 'https://vision.googleapis.com/v1/images:annotate?key=' + API_KEY;
const translateApi = 'https://www.googleapis.com/language/translate/v2?key=' + API_KEY;
const { width } = Dimensions.get('window');

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      showSpinner: false,
      showModal: false,
      description: null,
      locale: null,
      translatedDesc: null
    };
    this.toggleLoader = this.toggleLoader.bind(this);
  }

  componentDidMount() {
    StatusBar.setHidden(true);
  }

  toggleLoader() {
    this.setState({
      showSpinner: !this.state.showSpinner
    });
  }

  takePicture = async function () {
    this.toggleLoader();
    if (this.camera) {
      this.setState({ loading: true });
      const options = { base64: true, fixOrientation: true, width: 720, cropToPreview: true };
      const data = await this.camera.takePictureAsync(options);
      console.log(data.base64.replace(/\n|\r/g, ""));
      axios.post(visionApi, {
        requests: [
          {
            image: {
              content: data.base64.replace(/\n|\r/g, "")
            },
            features: [{
              type: 'TEXT_DETECTION',
              maxResults: 1
            }],
            imageContext: {
              languageHints: ["en-t-i0-handwrit", "zh-CN", "zh-TW", "ja"]
            }
          }
        ]
      })
        .then((response) => {
          console.log(response);
          const textAnnotations = response.data.responses[0].textAnnotations[0];
          const textContent = textAnnotations.description;
          const detectedLanguage = textAnnotations.locale;
          this.setState({
            description: textContent,
            locale: detectedLanguage
          })
        })
        .catch(error => console.log(error, 'error'));
      this.setState({
        showSpinner: false,
        loading: false,
        showModal: true
      })
    }
  }

  pickerChange(lang) {
    if (lang !== 0) {
      this.setState({
        language: lang
      })
      this.toggleLoader();
      const self = this;
      axios.get(translateApi, {
        params: {
          q: self.state.description,
          source: self.state.locale,
          target: lang
        }
      })
        .then(function (response) {
          const translatedText = response.data.data.translations[0].translatedText;
          self.setState({
            translatedDesc: translatedText,
            showSpinner: false,
          });
        })
        .catch(function (error) {
          console.log(error);
        });
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.title}>
          <TouchableOpacity onPress={this.handleExit.bind(this)}>
            <Image source={require('./assets/exit.png')} style={styles.exitIcon} />
          </TouchableOpacity>
        </View>
        <RNCamera
          ref={(ref) => {
            this.camera = ref;
          }}
          style={styles.preview}
          permissionDialogTitle="Permission to use camera"
          permissionDialogMessage="We need your permission to use your camera phone"
          ratio="1:1"
        />
        <View style={styles.buttonContainer}>
          <View style={styles.cameraButton}>
            <TouchableOpacity onPress={this.takePicture.bind(this)} disabled={this.state.loading}>
              <Image source={require('./assets/capture.png')} style={styles.captureIcon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* SPINNER WHILE CAPTURING IMAGE */}
        <Spinner visible={this.state.showSpinner} />

        {/* MODAL VIEW WHEN DATA BASE64 IS SET */}
        <Modal
          offset={0}
          open={this.state.showModal}
          modalDidOpen={() => { }}
          modalDidClose={() => { }}
          closeOnTouchOutside={false}
          disableOnBackPress={true} >
          <View>
            {
              !this.state.description ? <ActivityIndicator style={{ padding: 15 }} size="small" color="#75aaff" /> :
                <View>
                  <Text style={{ textAlign: 'center', marginBottom: 10, fontSize: 15, letterSpacing: 1, color: 'black' }}>RESULTS</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ margin: 15, fontSize: 15, letterSpacing: 1 }}>LANGUAGE DETECTED:</Text>
                    <Text style={{ fontWeight: 'bold', margin: 15, fontSize: 15, color: 'black', letterSpacing: 1 }}>{`${this.findLanguage(this.state.locale, languageSelection)}`}</Text>
                  </View>

                  <View style={{ margin: 5, backgroundColor: '#E8E8E8', borderRadius: 10, marginBottom: 20 }}>
                    <TextInput style={{ textAlign: 'center', color: 'black' }} value={this.state.description} editable={false} multiline={true} />
                  </View>

                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ margin: 15, fontSize: 15, letterSpacing: 1 }}>TRANSLATE TO:</Text>
                    <Picker
                      style={{ width: 170, transform: [{ scaleX: 1 }, { scaleY: 1 },], height: -4 }}
                      selectedValue={this.state.language}
                      onValueChange={this.pickerChange.bind(this)}>
                      <Picker.Item key={0} label={"Please select..."} value={0} />
                      {
                        languageSelection.map((language) => {
                          return <Picker.Item key={language.key} label={language.label} value={language.value} />
                        })
                      }
                    </Picker>
                  </View>

                  <View style={{ margin: 5, backgroundColor: '#E8E8E8', borderRadius: 10, marginBottom: 10 }}>
                    <TextInput style={{ textAlign: 'center', color: 'black' }} value={!this.state.translatedDesc ? 'Translating...' : this.state.translatedDesc} placeholder={"Choose a target language to start translating."} editable={false} multiline={true} />
                  </View>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={this.cleanUpCamera.bind(this)}>
                    <Text style={{ textAlign: 'center', letterSpacing: 1 }}>Close</Text>
                  </TouchableOpacity>
                </View>
            }
          </View>
        </Modal>
      </View>
    );
  }

  cleanUpCamera() {
    this.setState({
      loading: false,
      showSpinner: false,
      showModal: false,
      description: null,
      locale: null,
      translatedDesc: null
    })
  }

  handleExit() {
    Alert.alert(
      'Information',
      'Are you sure want to exit?', [{
        text: 'Cancel',
        style: 'cancel'
      }, {
        text: 'Yes',
        onPress: () => RNExitApp.exitApp()
      },], {
        cancelable: false
      }
    )
  }

  findLanguage(value, langArr) {
    for (let i = 0; i < langArr.length; i++) {
      if (langArr[i].value === value) {
        return langArr[i].label;
      }
    }
    return 'language not yet supported. ';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
  },
  rowContainer: {
    flexDirection: 'row'
  },
  captureIcon: {
    width: 60, height: 60
  },
  exitIcon: {
    width: 20,
    height: 20,
  },
  title: {
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  modalContainer: {
    margin: 10,
    alignItems: 'center'
  },
  preview: {
    alignItems: 'center',
    width,
    height: width,
  },
  buttonContainer: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    borderWidth: 6,
    borderColor: '#eaeaea',
    height: 75,
    width: 75,
    margin: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 45,
  },
  closeButton: {
    margin: 15,
    backgroundColor: '#e1e9ef',
    padding: 10,
    width: 70,
    borderRadius: 20,
    alignSelf: 'center'
  }
});

// Language Selection here

const languageSelection = [
  {
    key: 1,
    label: 'Chinese',
    value: 'zh-CN'
  },
  {
    key: 2,
    label: 'Korean',
    value: 'ko'
  },
  {
    key: 3,
    label: 'Japanese',
    value: 'ja'
  },
  {
    key: 4,
    label: 'English',
    value: 'en'
  },
  {
    key: 5,
    label: 'German',
    value: 'de'
  }
]