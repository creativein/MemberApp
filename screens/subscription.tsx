import React, { Component } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, ImageBackground } from 'react-native';
import firebase from '../database/firebase';
import CardSilder from './slider';

const image = require("../images/sub1.jpg");
// Not assigning it in state since setPackage fn gets called multiple times
let packageSelected: number = 0;

export default class Subscription extends Component {
  db: firebase.firestore.Firestore;


  constructor() {
    super();
    this.state = {
      packages: [],
      isLoading: false
    }

    this.db = firebase.firestore();
  }

  updateInputVal = (val: any, prop: React.ReactText) => {
    const state = this.state;
    state[prop] = val;
    this.setState(state);
  }

  UNSAFE_componentWillMount() {
    this.setState({
      isLoading: true
    });

    this.db.collection("package_list")
      .orderBy('chatNumber', 'asc')
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          let docData: firebase.firestore.DocumentData;
          docData = doc.data();

          this.setState(prevState => {
            return {
              packages: [...prevState.packages, docData],
            };
          });
        });

        this.setState({
          isLoading: false
        });
      })
      .catch(err => {
        this.setState({
          isLoading: false
        });
        console.error('Error in package fetch', err);
      })
  }

  getConfirmation() {
    Alert.alert('', 'Are you sure want to subscribe this package?',
      [
        {
          text: 'Cancel'
        },
        {
          text: 'OK',
          onPress: () => this.setSubscription()
        }
      ]);
  }

  setSubscription() {
    const packageDetails = this.state.packages[packageSelected];
    const packageDoc = {
      member_mobile: this.props.route.params.user.mobile.toString(),
      package_name: packageDetails.name,
      request_date_time: new Date().toLocaleDateString("en-US"),
      status: 'pending',
      accepted_by: '',
      remaining_chat: packageDetails.chatNumber,
      expiry_date: '',
      name: this.props.route.params.user.name,
      id: new Date().getTime().toString()
    };

    const db = this.db.collection("subscription_list")
      .doc(packageDoc.member_mobile);

    db
      .set({ id: packageDoc.id }) // sample field for avoiding shallow data
      .then(_ => {
        db.collection('list')
          .doc(packageDoc.id)
          .set(packageDoc)
          .then(_ => {
            Alert.alert('', 'Thank you for subscribing. Your account will be updated soon.',
              [
                {
                  text: 'OK',
                  onPress: () =>
                    this.props.navigation.navigate('HomeComp',
                      {
                        screen: 'Home',
                        params: {
                          user: this.props.route.params.user
                        }
                      }
                    )
                }
              ]);
          })
          .catch(err => console.log('Subscription update error = ', err));
      }).catch(err => console.log('Subscription update error = ', err));

  }

  setPackage(currentPackage: number) {
    packageSelected = currentPackage;
  }

  getPackageColor(item: { name: string }) {
    switch (item.name) {
      case 'Bronze': return { backgroundColor: '#cd7f32' }
      case 'Silver':
      case 'Gold': return { backgroundColor: item.name.toLowerCase() }
    }
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={styles.preloader}>
          <ActivityIndicator size="large" color="#9E9E9E" />
        </View>
      )
    }
    return (
      <View style={styles.container}>
        <ImageBackground source={image} style={styles.image}>
          <CardSilder style={{ marginTop: 60 }} onPackageChange={this.setPackage}>
            {this.state.packages.map((item, index) => (
              <View key={index}>
                <Text style={styles.packagaeName}> {item.name}</Text>
                <View key={item.name}
                  style={[styles.package, this.getPackageColor(item)]}>
                  <Text style={styles.packageText}>
                    Chat count: {item.chatNumber}
                  </Text>
                  <Text style={styles.packageText}>
                    Rs. {item.price}
                  </Text>
                  <Text style={styles.packageText}>
                    Valid: {item.validity} Months
            </Text>
                </View>
              </View>
            ))}
          </CardSilder>

          <TouchableOpacity
            onPress={() => this.getConfirmation()}
            style={styles.button}>
            <Text style={styles.buttonText}>Subscribe</Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    backgroundColor: '#fff',
  },
  image: {
    flex: 1,
    justifyContent: "center",
  },
  package: {
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#dcdcdc'
  },
  packagaeName: {
    color: '#fff',
    fontSize: 36,
    backgroundColor: '#2756ab',
    width: 140,
    height: 140,
    borderRadius: 140,
    alignSelf: 'center',
    marginBottom: -70,
    position: 'relative',
    zIndex: 1,
    textAlignVertical: 'center',
    textAlign: 'center',
    paddingRight: 5
  },
  packageText: {
    color: '#000',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  bronze: {
    backgroundColor: '#cd7f32'
  },
  button: {
    marginHorizontal: 20,
    marginBottom: 60,
    padding: 20,
    alignContent: 'center',
    backgroundColor: "#3740FE",
    borderRadius: 4
  },
  buttonText: {
    textAlign: 'center',
    color: "#fff",
    fontSize: 20,
    fontWeight: 'bold'
  },
  preloader: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  }
});