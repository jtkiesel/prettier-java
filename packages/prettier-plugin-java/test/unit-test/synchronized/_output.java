class Synchronized {
  void doSomething() {
    synchronized (() {
      doSynchronized();
    }
  }
}
